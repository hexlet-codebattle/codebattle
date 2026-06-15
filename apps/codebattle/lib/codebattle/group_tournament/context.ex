defmodule Codebattle.GroupTournament.Context do
  @moduledoc false

  import Ecto.Query

  alias Codebattle.GroupTask.Context, as: GroupTaskContext
  alias Codebattle.GroupTaskSolution
  alias Codebattle.GroupTournament
  alias Codebattle.GroupTournament.GlobalSupervisor
  alias Codebattle.GroupTournament.Server
  alias Codebattle.GroupTournament.SliceRunner
  alias Codebattle.GroupTournamentPlayer
  alias Codebattle.GroupTournamentRoundScore
  alias Codebattle.Repo
  alias Codebattle.User
  alias Codebattle.UserGroupTournament
  alias Codebattle.UserGroupTournament.Context, as: UserGroupTournamentContext
  alias Codebattle.UserGroupTournamentRun

  @spec list_group_tournaments(keyword()) :: list(GroupTournament.t())
  def list_group_tournaments(opts \\ []) do
    sort_by = Keyword.get(opts, :sort_by, :id)
    sort_dir = Keyword.get(opts, :sort_dir, :desc)

    GroupTournament
    |> order_by([gt], [
      {:asc, fragment("CASE WHEN ? = 'active' THEN 0 ELSE 1 END", gt.state)},
      {^sort_dir, field(gt, ^sort_by)}
    ])
    |> preload([:creator, :group_task, :players])
    |> Repo.all()
    |> Enum.map(&enrich/1)
  end

  @spec get_group_tournament!(String.t() | pos_integer(), keyword()) :: GroupTournament.t()
  def get_group_tournament!(id, opts \\ []) do
    preload_players? = Keyword.get(opts, :preload_players, true)

    GroupTournament
    |> Repo.get!(id)
    |> Repo.preload(group_tournament_preloads(preload_players?))
    |> enrich()
  end

  @spec get_group_tournament(String.t() | pos_integer(), keyword()) :: GroupTournament.t() | nil
  def get_group_tournament(id, opts \\ []) do
    get_group_tournament!(id, opts)
  rescue
    Ecto.NoResultsError -> nil
  end

  def get_current_for_player_page(id) do
    case Server.get_group_tournament(id) do
      nil -> get_group_tournament(id, preload_players: false)
      group_tournament -> enrich(group_tournament)
    end
  end

  def get_current_for_player_page!(id) do
    get_current_for_player_page(id) || raise Ecto.NoResultsError, queryable: GroupTournament
  end

  @spec get_player(pos_integer(), pos_integer()) :: GroupTournamentPlayer.t() | nil
  def get_player(group_tournament_id, user_id) do
    Repo.get_by(GroupTournamentPlayer, group_tournament_id: group_tournament_id, user_id: user_id)
  end

  @spec create_group_tournament(map()) :: {:ok, GroupTournament.t()} | {:error, Ecto.Changeset.t()}
  def create_group_tournament(attrs) do
    case %GroupTournament{} |> GroupTournament.changeset(attrs) |> Repo.insert() do
      {:ok, group_tournament} ->
        enriched = get_group_tournament!(group_tournament.id)
        :ok = ensure_server_started(enriched)
        {:ok, enriched}

      error ->
        error
    end
  end

  @spec update_group_tournament(GroupTournament.t(), map()) ::
          {:ok, GroupTournament.t()} | {:error, Ecto.Changeset.t()}
  def update_group_tournament(group_tournament, attrs) do
    case group_tournament |> GroupTournament.changeset(attrs) |> Repo.update() do
      {:ok, updated} ->
        enriched = get_group_tournament!(updated.id)
        :ok = ensure_server_started(enriched)
        Server.update_group_tournament(enriched)
        {:ok, enriched}

      error ->
        error
    end
  end

  @spec change_group_tournament(GroupTournament.t(), map()) :: Ecto.Changeset.t()
  def change_group_tournament(group_tournament, attrs \\ %{}) do
    GroupTournament.changeset(group_tournament, attrs)
  end

  @spec start_tournament(pos_integer(), map()) ::
          {:ok, GroupTournament.t()} | {:error, atom()}
  def start_tournament(group_tournament_id, user) do
    :ok = ensure_server_started(group_tournament_id)
    Server.start_tournament(group_tournament_id, user)
  end

  @spec delete_group_tournament(GroupTournament.t()) ::
          {:ok, GroupTournament.t()} | {:error, Ecto.Changeset.t()}
  def delete_group_tournament(group_tournament) do
    GlobalSupervisor.terminate_group_tournament(group_tournament.id)
    Repo.delete(group_tournament)
  end

  @spec retry_group_tournament(GroupTournament.t()) ::
          {:ok, GroupTournament.t()} | {:error, term()}
  def retry_group_tournament(%GroupTournament{} = group_tournament) do
    result =
      Repo.transaction(fn ->
        player_ids = Enum.map(group_tournament.players, & &1.user_id)

        GroupTournamentRoundScore
        |> where([rs], rs.group_tournament_id == ^group_tournament.id)
        |> Repo.delete_all()

        UserGroupTournamentRun
        |> where([run], run.group_tournament_id == ^group_tournament.id)
        |> Repo.delete_all()

        if player_ids != [] do
          GroupTaskSolution
          |> where([solution], solution.group_tournament_id == ^group_tournament.id and solution.user_id in ^player_ids)
          |> Repo.delete_all()
        end

        GroupTournamentPlayer
        |> where([player], player.group_tournament_id == ^group_tournament.id)
        |> Repo.update_all(
          set: [
            state: "active",
            total_score: 0,
            seed_score: nil,
            seed_duration_ms: nil,
            slice_index: nil,
            slice_ranking: nil,
            place: nil,
            last_round_place: nil,
            consecutive_zero_rounds: 0,
            updated_at: NaiveDateTime.utc_now(:second)
          ]
        )

        group_tournament
        |> GroupTournament.changeset(%{
          state: "waiting_participants",
          starts_at: reset_starts_at(group_tournament.starts_at),
          started_at: nil,
          finished_at: nil,
          current_round_position: 0,
          last_round_started_at: nil,
          last_round_ended_at: nil,
          meta: %{}
        })
        |> Repo.update!()
      end)

    case result do
      {:ok, updated} ->
        enriched = get_group_tournament!(updated.id)
        :ok = ensure_server_started(enriched)
        Server.update_group_tournament(enriched)
        {:ok, enriched}

      error ->
        error
    end
  end

  @spec reset_group_tournament(GroupTournament.t()) ::
          {:ok, GroupTournament.t()} | {:error, term()}
  def reset_group_tournament(%GroupTournament{} = group_tournament) do
    result =
      Repo.transaction(fn ->
        player_ids = Enum.map(group_tournament.players, & &1.user_id)

        UserGroupTournament
        |> where([record], record.group_tournament_id == ^group_tournament.id)
        |> Repo.delete_all()

        UserGroupTournamentRun
        |> where([run], run.group_tournament_id == ^group_tournament.id)
        |> Repo.delete_all()

        if player_ids != [] do
          GroupTaskSolution
          |> where([solution], solution.group_tournament_id == ^group_tournament.id and solution.user_id in ^player_ids)
          |> Repo.delete_all()
        end

        GroupTournamentPlayer
        |> where([player], player.group_tournament_id == ^group_tournament.id)
        |> Repo.delete_all()

        group_tournament
        |> GroupTournament.changeset(%{
          state: "waiting_participants",
          starts_at: reset_starts_at(group_tournament.starts_at),
          started_at: nil,
          finished_at: nil,
          current_round_position: 0,
          last_round_started_at: nil,
          last_round_ended_at: nil,
          meta: %{}
        })
        |> Repo.update!()
      end)

    case result do
      {:ok, updated} ->
        enriched = get_group_tournament!(updated.id)
        :ok = ensure_server_started(enriched)
        Server.update_group_tournament(enriched)
        {:ok, enriched}

      error ->
        error
    end
  end

  @spec create_or_update_player(GroupTournament.t(), pos_integer(), map()) ::
          {:ok, GroupTournamentPlayer.t()} | {:error, Ecto.Changeset.t()}
  def create_or_update_player(%GroupTournament{id: group_tournament_id}, user_id, attrs) do
    params =
      attrs
      |> Map.new()
      |> Map.put(:group_tournament_id, group_tournament_id)
      |> Map.put(:user_id, user_id)

    case Repo.get_by(GroupTournamentPlayer, group_tournament_id: group_tournament_id, user_id: user_id) do
      nil ->
        %GroupTournamentPlayer{}
        |> GroupTournamentPlayer.changeset(params)
        |> Repo.insert()

      player ->
        player
        |> GroupTournamentPlayer.changeset(params)
        |> Repo.update()
    end
  end

  @spec list_runs(GroupTournament.t() | pos_integer(), keyword()) :: list(UserGroupTournamentRun.t())
  def list_runs(group_tournament_or_id, opts \\ [])

  def list_runs(%GroupTournament{id: id}, opts), do: list_runs(id, opts)

  def list_runs(group_tournament_id, opts) do
    limit = Keyword.get(opts, :limit, 50)
    offset = Keyword.get(opts, :offset, 0)
    kind = Keyword.get(opts, :kind)
    visible_for_user_id = Keyword.get(opts, :visible_for_user_id)

    base =
      UserGroupTournamentRun
      |> where([run], run.group_tournament_id == ^group_tournament_id)
      |> filter_kind(kind)
      |> filter_visible_for(visible_for_user_id)

    # Each run_key has one row per participating user. When filtering for a
    # specific viewer we already have at most one row per run_key, so we can
    # skip the latest-id-per-key dedup; otherwise (admin view) keep it.
    base
    |> dedup_by_run_key(visible_for_user_id)
    |> order_by([run], desc: run.inserted_at, desc: run.id)
    |> offset(^offset)
    |> maybe_limit(limit)
    |> Repo.all()
  end

  defp dedup_by_run_key(query, nil) do
    latest_run_ids =
      query
      |> exclude(:order_by)
      |> group_by([run], run.run_key)
      |> select([run], max(run.id))

    from(run in UserGroupTournamentRun, where: run.id in subquery(latest_run_ids))
  end

  defp dedup_by_run_key(query, _user_id), do: query

  @spec count_runs(GroupTournament.t() | pos_integer(), keyword()) :: non_neg_integer()
  def count_runs(group_tournament_or_id, opts \\ [])
  def count_runs(%GroupTournament{id: id}, opts), do: count_runs(id, opts)

  def count_runs(group_tournament_id, opts) do
    kind = Keyword.get(opts, :kind)

    UserGroupTournamentRun
    |> where([run], run.group_tournament_id == ^group_tournament_id)
    |> filter_kind(kind)
    |> select([run], count(fragment("DISTINCT ?", run.run_key)))
    |> Repo.one()
    |> Kernel.||(0)
  end

  defp filter_kind(query, :slice), do: where(query, [run], run.kind == "slice")
  defp filter_kind(query, :user), do: where(query, [run], run.kind == "user")
  defp filter_kind(query, :seed), do: where(query, [run], run.kind == "seed")

  defp filter_kind(query, [_ | _] = kinds) do
    kinds = Enum.map(kinds, &to_string/1)
    where(query, [run], run.kind in ^kinds)
  end

  defp filter_kind(query, _), do: query

  defp filter_visible_for(query, nil), do: query

  defp filter_visible_for(query, user_id) when is_integer(user_id) do
    query
    |> join(:inner, [run], ugt in UserGroupTournament, on: ugt.id == run.user_group_tournament_id)
    |> where([_run, ugt], ugt.user_id == ^user_id)
  end

  @spec list_players(pos_integer(), keyword()) :: list(GroupTournamentPlayer.t())
  def list_players(group_tournament_id, opts \\ []) do
    limit = Keyword.get(opts, :limit, 30)
    offset = Keyword.get(opts, :offset, 0)
    slice_index = Keyword.get(opts, :slice_index)

    GroupTournamentPlayer
    |> where([p], p.group_tournament_id == ^group_tournament_id)
    |> filter_slice(slice_index)
    |> order_by([p], asc_nulls_last: p.slice_index, asc: p.id)
    |> offset(^offset)
    |> limit(^limit)
    |> preload(:user)
    |> Repo.all()
  end

  @spec count_players(pos_integer(), keyword()) :: non_neg_integer()
  def count_players(group_tournament_id, opts \\ []) do
    slice_index = Keyword.get(opts, :slice_index)

    GroupTournamentPlayer
    |> where([p], p.group_tournament_id == ^group_tournament_id)
    |> filter_slice(slice_index)
    |> select([p], count(p.id))
    |> Repo.one()
    |> Kernel.||(0)
  end

  @spec list_slice_summaries(pos_integer()) :: list(%{slice_index: integer(), count: non_neg_integer()})
  def list_slice_summaries(group_tournament_id) do
    GroupTournamentPlayer
    |> where([p], p.group_tournament_id == ^group_tournament_id and not is_nil(p.slice_index))
    |> group_by([p], p.slice_index)
    |> order_by([p], asc: p.slice_index)
    |> select([p], %{slice_index: p.slice_index, count: count(p.id)})
    |> Repo.all()
  end

  @spec list_paginated_solutions(pos_integer(), pos_integer(), keyword()) :: list(GroupTaskSolution.t())
  def list_paginated_solutions(group_tournament_id, group_task_id, opts \\ []) do
    limit = Keyword.get(opts, :limit, 30)
    offset = Keyword.get(opts, :offset, 0)

    latest_ids =
      from(s in GroupTaskSolution,
        where: s.group_task_id == ^group_task_id and s.group_tournament_id == ^group_tournament_id,
        group_by: s.user_id,
        select: max(s.id)
      )

    GroupTaskSolution
    |> where([s], s.id in subquery(latest_ids))
    |> order_by([s], desc: s.inserted_at, desc: s.id)
    |> offset(^offset)
    |> limit(^limit)
    |> preload(:user)
    |> Repo.all()
  end

  @spec count_latest_solutions(pos_integer(), pos_integer()) :: non_neg_integer()
  def count_latest_solutions(group_tournament_id, group_task_id) do
    Repo.one(
      from(s in GroupTaskSolution,
        where: s.group_task_id == ^group_task_id and s.group_tournament_id == ^group_tournament_id,
        select: count(fragment("DISTINCT ?", s.user_id))
      )
    ) || 0
  end

  defp filter_slice(query, nil), do: query

  defp filter_slice(query, :unassigned) do
    where(query, [p], is_nil(p.slice_index))
  end

  defp filter_slice(query, slice_index) when is_integer(slice_index) do
    where(query, [p], p.slice_index == ^slice_index)
  end

  defp maybe_limit(query, :infinity), do: query
  defp maybe_limit(query, limit), do: limit(query, ^limit)

  @spec list_tokens(GroupTournament.t() | pos_integer(), keyword()) :: list(UserGroupTournament.t())
  def list_tokens(group_tournament_or_id, opts \\ [])

  def list_tokens(%GroupTournament{id: id}, opts), do: list_tokens(id, opts)
  def list_tokens(group_tournament_id, opts), do: UserGroupTournamentContext.list_tokens(group_tournament_id, opts)

  @spec create_or_rotate_token(GroupTournament.t() | pos_integer(), pos_integer()) ::
          {:ok, UserGroupTournament.t()} | {:error, Ecto.Changeset.t()}
  def create_or_rotate_token(%GroupTournament{id: id}, user_id), do: create_or_rotate_token(id, user_id)

  def create_or_rotate_token(group_tournament_id, user_id),
    do: UserGroupTournamentContext.create_or_rotate_token(group_tournament_id, user_id)

  @spec get_or_create_token(GroupTournament.t() | pos_integer(), pos_integer()) ::
          {:ok, UserGroupTournament.t()} | {:error, Ecto.Changeset.t()}
  def get_or_create_token(%GroupTournament{id: id}, user_id), do: get_or_create_token(id, user_id)

  def get_or_create_token(group_tournament_id, user_id),
    do: UserGroupTournamentContext.get_or_create_token(group_tournament_id, user_id)

  @spec get_token_by_value(String.t()) :: UserGroupTournament.t() | nil
  def get_token_by_value(token), do: UserGroupTournamentContext.get_token_by_value(token)

  @spec create_solution_from_token(String.t(), map()) ::
          {:ok, GroupTaskSolution.t()} | {:error, :invalid_token | Ecto.Changeset.t()}
  def create_solution_from_token(token, attrs) do
    case get_token_by_value(token) do
      nil ->
        {:error, :invalid_token}

      %{group_tournament: %{group_task_id: group_task_id}} = token_record ->
        GroupTaskContext.create_solution_from_submission(group_task_id, token_record.user_id, %{
          group_tournament_id: token_record.group_tournament_id,
          lang: Map.get(attrs, "lang") || Map.get(attrs, :lang),
          solution: Map.get(attrs, "solution") || Map.get(attrs, :solution)
        })
    end
  end

  @spec create_solution_from_token_and_run(String.t(), map()) ::
          {:ok, GroupTaskSolution.t()} | {:error, :invalid_token | :tournament_finished | Ecto.Changeset.t()}
  def create_solution_from_token_and_run(token, attrs) do
    case get_token_by_value(token) do
      nil ->
        {:error, :invalid_token}

      %{group_tournament: %{state: "active"} = group_tournament, user_id: user_id} ->
        group_tournament.group_task_id
        |> GroupTaskContext.create_solution_from_submission(user_id, %{
          group_tournament_id: group_tournament.id,
          lang: Map.get(attrs, "lang") || Map.get(attrs, :lang),
          solution: Map.get(attrs, "solution") || Map.get(attrs, :solution)
        })
        |> case do
          {:ok, solution} ->
            enqueue_post_submit(solution)
            {:ok, solution}

          {:error, _} = error ->
            error
        end

      %{group_tournament: _group_tournament} ->
        {:error, :tournament_finished}
    end
  end

  defp enqueue_post_submit(%GroupTaskSolution{id: solution_id}) do
    %{solution_id: solution_id}
    |> Codebattle.Workers.GroupTaskSolutionPostSubmitWorker.new()
    |> Oban.insert()
  end

  @spec get_current(pos_integer()) :: GroupTournament.t() | nil
  def get_current(id) do
    case Server.get_group_tournament(id) do
      nil -> get_group_tournament(id)
      group_tournament -> enrich(group_tournament)
    end
  end

  @spec ensure_server_started(GroupTournament.t() | pos_integer() | String.t()) :: :ok
  def ensure_server_started(%GroupTournament{id: id} = group_tournament) do
    case Server.get_group_tournament(id) do
      nil ->
        case GlobalSupervisor.start_group_tournament(group_tournament) do
          {:ok, _pid} -> :ok
          {:error, {:already_started, _pid}} -> :ok
          {:error, :already_present} -> :ok
          {:error, {:already_present, _pid}} -> :ok
          _ -> :ok
        end

      _group_tournament ->
        :ok
    end
  end

  def ensure_server_started(id) do
    id
    |> get_group_tournament!()
    |> ensure_server_started()
  end

  @spec bulk_transfer_players(pos_integer(), list(map())) :: :ok
  def bulk_transfer_players(group_tournament_id, players) do
    now = NaiveDateTime.truncate(NaiveDateTime.utc_now(), :second)

    player_entries =
      Enum.map(players, fn player ->
        %{
          group_tournament_id: group_tournament_id,
          user_id: player.id,
          lang: player.lang || "js",
          state: "active",
          inserted_at: now,
          updated_at: now
        }
      end)

    user_group_tournament_entries =
      Enum.map(players, fn player ->
        %{
          group_tournament_id: group_tournament_id,
          user_id: player.id,
          state: "pending",
          repo_state: "pending",
          role_state: "pending",
          secret_state: "pending",
          repo_response: %{},
          role_response: %{},
          secret_response: %{},
          last_error: %{},
          inserted_at: now,
          updated_at: now
        }
      end)

    player_entries
    |> Enum.chunk_every(1000)
    |> Enum.each(fn chunk ->
      Repo.insert_all(GroupTournamentPlayer, chunk, on_conflict: :nothing)
    end)

    user_group_tournament_entries
    |> Enum.chunk_every(1000)
    |> Enum.each(fn chunk ->
      Repo.insert_all(UserGroupTournament, chunk, on_conflict: :nothing)
    end)

    :ok
  end

  defp enrich(%GroupTournament{} = group_tournament) do
    players_count =
      if Ecto.assoc_loaded?(group_tournament.players) do
        length(group_tournament.players || [])
      else
        count_players(group_tournament.id)
      end

    Map.put(group_tournament, :players_count, players_count)
  end

  defp group_tournament_preloads(true), do: [:creator, :group_task, players: [:user]]
  defp group_tournament_preloads(false), do: [:creator, :group_task]

  defp reset_starts_at(%DateTime{} = starts_at) do
    now = DateTime.utc_now()

    case DateTime.compare(starts_at, now) do
      :gt -> starts_at
      _ -> DateTime.add(now, 5 * 60, :second)
    end
  end

  @spec maybe_run_after_solution_submission(pos_integer() | nil, GroupTaskSolution.t() | nil, keyword()) :: :ok
  def maybe_run_after_solution_submission(group_tournament_id, submitted_solution \\ nil, opts \\ [])

  def maybe_run_after_solution_submission(nil, _submitted_solution, _opts), do: :ok

  def maybe_run_after_solution_submission(_group_tournament_id, nil, _opts), do: :ok

  def maybe_run_after_solution_submission(group_tournament_id, submitted_solution, _opts) do
    case get_group_tournament(group_tournament_id) do
      %{state: "active"} = gt ->
        run_per_submission_preview(gt, submitted_solution)

      _ ->
        :ok
    end
  end

  # Per-submission preview: shows the submitter how their new code stacks up
  # right now. Runs ALWAYS bypass tournament scoring — official scoring is
  # the round-end slice run (see SliceRunner.run_all_slices).
  #
  #   * Seed round (ranked + has_seed_round + round 1): solo vs bots so the
  #     player can iterate on a baseline.
  #   * Slice round (ranked, slice already assigned): run the whole slice
  #     using everyone's latest solution — head-to-head preview within the
  #     slice.
  #   * Anything else (non-ranked, or ranked without a slice yet): solo run
  #     using the tournament's `include_bots` setting.
  defp run_per_submission_preview(gt, %{user_id: user_id} = _submitted_solution) do
    cond do
      GroupTournament.seeding_round?(gt) ->
        run_solo_preview(gt, user_id, _include_bots = true)

      GroupTournament.ranked?(gt) ->
        case SliceRunner.run_slice_preview(gt, user_id) do
          :no_slice -> run_solo_preview(gt, user_id, gt.include_bots)
          _ -> :ok
        end

      true ->
        run_solo_preview(gt, user_id, gt.include_bots)
    end

    :ok
  end

  defp run_solo_preview(%GroupTournament{} = gt, user_id, include_bots) do
    GroupTaskContext.run_group_task(gt.group_task, [user_id], %{
      group_tournament_id: gt.id,
      include_bots: include_bots,
      round: gt.current_round_position || 1
    })
  end

  def serialize_group_tournament(%GroupTournament{} = group_tournament) do
    group_tournament
    |> Map.take([
      :id,
      :name,
      :slug,
      :description,
      :state,
      :starts_at,
      :started_at,
      :finished_at,
      :current_round_position,
      :rounds_count,
      :round_timeout_seconds,
      :seed_round_timeout_seconds,
      :type,
      :has_seed_round,
      :break_duration_seconds,
      :include_bots,
      :last_round_started_at,
      :last_round_ended_at,
      :players_count,
      :group_task_id,
      :template_id,
      :meta,
      :show_leaderboard
    ])
    |> Map.put(:group_task_slug, group_tournament.group_task && group_tournament.group_task.slug)
  end

  @doc """
  Returns the leaderboard for a group tournament: one entry per active+left
  player with their total_score, current slice, and a `rounds` map keyed by
  round_position with `%{slice_index, place, score}` entries.

  Ordered by total_score desc, then seed_score desc, then user_id asc as a
  stable tie-break.

  Implemented as a single SQL query so a 1000-player tournament rebuild is
  one DB roundtrip plus an O(P) Elixir post-process, instead of two queries
  + in-memory group_by + sort. Postgres builds the per-player `rounds` map
  via json_object_agg and does the sort using indexed columns.
  """
  @spec build_leaderboard(pos_integer()) :: list(map())
  def build_leaderboard(group_tournament_id) do
    sql = """
    SELECT
      p.user_id,
      u.name,
      u.avatar_url,
      u.clan,
      u.clan_id,
      p.state,
      p.slice_index,
      COALESCE(p.total_score, 0) AS total_score,
      p.seed_score,
      p.last_round_place,
      COALESCE(
        json_object_agg(
          rs.round_position,
          json_build_object(
            'slice_index', rs.slice_index,
            'place',       rs.place,
            'score',       rs.score
          )
        ) FILTER (WHERE rs.round_position IS NOT NULL),
        '{}'::json
      ) AS rounds
    FROM group_tournament_players p
    LEFT JOIN users u
      ON u.id = p.user_id
    LEFT JOIN group_tournament_round_scores rs
      ON rs.group_tournament_id = p.group_tournament_id
     AND rs.user_id              = p.user_id
    WHERE p.group_tournament_id = $1
    GROUP BY p.id, u.id
    ORDER BY COALESCE(p.total_score, 0) DESC,
             COALESCE(p.seed_score, 0)  DESC,
             p.user_id ASC
    """

    %{rows: rows} = Repo.query!(sql, [group_tournament_id])

    Enum.map(rows, &row_to_leaderboard_entry/1)
  end

  defp row_to_leaderboard_entry([
         user_id,
         name,
         avatar_url,
         clan,
         clan_id,
         state,
         slice_index,
         total_score,
         seed_score,
         last_round_place,
         rounds_json
       ]) do
    rounds =
      rounds_json
      |> decode_rounds_map()
      |> maybe_put_seed_round(seed_score, slice_index)

    %{
      user_id: user_id,
      name: name,
      avatar_url: avatar_url,
      clan: clan,
      clan_id: clan_id,
      state: state,
      slice_index: slice_index,
      total_score: total_score,
      seed_score: seed_score,
      last_round_place: last_round_place,
      rounds: rounds
    }
  end

  # json_object_agg returns a Postgres `json` column. Postgrex hands it back
  # as an already-decoded map with string keys (e.g. %{"1" => ...}); convert
  # to integer keys + atom-valued cells to match the cached leaderboard
  # shape that the rest of the code (and the UI) already uses.
  defp decode_rounds_map(rounds) when is_map(rounds) do
    Map.new(rounds, fn {round_position, cell} ->
      {to_integer_key(round_position),
       %{
         slice_index: cell["slice_index"],
         place: cell["place"],
         score: cell["score"]
       }}
    end)
  end

  defp decode_rounds_map(_), do: %{}

  defp to_integer_key(key) when is_integer(key), do: key
  defp to_integer_key(key) when is_binary(key), do: String.to_integer(key)

  # Synthesise R1 from the seeding pass so the UI can show the seed score in
  # the R1 column during the brief window between `run_seeding` completing
  # and `record_seed_round_scores` writing the persisted row. For
  # tournaments with `has_seed_round=false`, `seed_score` is nil and this is
  # a no-op.
  defp maybe_put_seed_round(rounds, seed_score, slice_index) when is_integer(seed_score) do
    if Map.has_key?(rounds, 1) do
      rounds
    else
      Map.put(rounds, 1, %{slice_index: slice_index, place: nil, score: seed_score})
    end
  end

  defp maybe_put_seed_round(rounds, _seed_score, _slice_index), do: rounds

  def serialize_run(run) do
    %{
      id: run.id,
      player_ids: run.player_ids,
      kind: run.kind,
      slice_index: run.slice_index,
      round_position: run.round_position,
      status: run.status,
      result: run.result,
      score: run.score,
      duration_ms: run.duration_ms,
      inserted_at: run.inserted_at
    }
  end

  def serialize_run_details(run, solution \\ nil) do
    run
    |> serialize_run()
    |> Map.merge(%{
      group_tournament_id: run.group_tournament_id,
      group_task_id: run.group_task_id,
      user_group_tournament_id: run.user_group_tournament_id,
      run_key: run.run_key,
      user_id: run.user_group_tournament && run.user_group_tournament.user_id,
      solution: solution && serialize_solution(solution)
    })
  end

  def serialize_solution(solution) do
    %{
      id: solution.id,
      user_id: solution.user_id,
      lang: solution.lang,
      solution: solution.solution,
      inserted_at: solution.inserted_at
    }
  end

  @spec get_run_details!(pos_integer(), User.t()) :: map()
  def get_run_details!(run_id, current_user) do
    %{run: run, solution: solution} = GroupTaskContext.get_run_with_solution!(run_id)

    if can_view_run_details?(current_user, run) do
      %{
        run: serialize_run_details(run, solution)
      }
    else
      raise Ecto.NoResultsError, queryable: UserGroupTournamentRun
    end
  end

  defp can_view_run_details?(current_user, %UserGroupTournamentRun{} = run) do
    cond do
      User.admin?(current_user) ->
        true

      match?(%{user_group_tournament: %{user_id: _}}, run) and
          run.user_group_tournament.user_id == current_user.id ->
        true

      is_list(run.player_ids) and current_user.id in run.player_ids ->
        true

      true ->
        false
    end
  end
end
