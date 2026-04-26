defmodule Codebattle.GroupTournament.Context do
  @moduledoc false

  import Ecto.Query

  alias Codebattle.GroupTask.Context, as: GroupTaskContext
  alias Codebattle.GroupTaskSolution
  alias Codebattle.GroupTournament
  alias Codebattle.GroupTournament.GlobalSupervisor
  alias Codebattle.GroupTournament.Server
  alias Codebattle.GroupTournamentPlayer
  alias Codebattle.PubSub
  alias Codebattle.Repo
  alias Codebattle.User
  alias Codebattle.UserGroupTournament
  alias Codebattle.UserGroupTournament.Context, as: UserGroupTournamentContext
  alias Codebattle.UserGroupTournamentRun

  @spec list_group_tournaments() :: list(GroupTournament.t())
  def list_group_tournaments do
    GroupTournament
    |> order_by([gt], desc: gt.id)
    |> preload([:creator, :group_task, :players])
    |> Repo.all()
    |> Enum.map(&enrich/1)
  end

  @spec get_group_tournament!(String.t() | pos_integer()) :: GroupTournament.t()
  def get_group_tournament!(id) do
    GroupTournament
    |> Repo.get!(id)
    |> Repo.preload([:creator, :group_task, players: [:user]])
    |> enrich()
  end

  @spec get_group_tournament(String.t() | pos_integer()) :: GroupTournament.t() | nil
  def get_group_tournament(id) do
    get_group_tournament!(id)
  rescue
    Ecto.NoResultsError -> nil
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

    latest_run_ids =
      UserGroupTournamentRun
      |> where([run], run.group_tournament_id == ^group_tournament_id)
      |> group_by([run], run.run_key)
      |> select([run], max(run.id))

    UserGroupTournamentRun
    |> where([run], run.id in subquery(latest_run_ids))
    |> order_by([run], desc: run.inserted_at, desc: run.id)
    |> maybe_limit(limit)
    |> Repo.all()
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
            maybe_run_after_solution_submission(solution.group_tournament_id, solution)
            {:ok, solution}

          {:error, _} = error ->
            error
        end

      %{group_tournament: _group_tournament} ->
        {:error, :tournament_finished}
    end
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
    Map.put(group_tournament, :players_count, length(group_tournament.players || []))
  end

  defp reset_starts_at(%DateTime{} = starts_at) do
    now = DateTime.utc_now()

    case DateTime.compare(starts_at, now) do
      :gt -> starts_at
      _ -> DateTime.add(now, 5 * 60, :second)
    end
  end

  @spec maybe_run_after_solution_submission(pos_integer() | nil, GroupTaskSolution.t() | nil) :: :ok
  def maybe_run_after_solution_submission(group_tournament_id, submitted_solution \\ nil)

  def maybe_run_after_solution_submission(nil, _submitted_solution), do: :ok

  def maybe_run_after_solution_submission(group_tournament_id, submitted_solution) do
    case get_group_tournament(group_tournament_id) do
      %{state: "active", group_task: group_task, include_bots: include_bots} ->
        player_ids = [submitted_solution.user_id]

        run_result =
          GroupTaskContext.run_group_task(group_task, player_ids, %{
            group_tournament_id: group_tournament_id,
            include_bots: include_bots
          })

        broadcast_run_update(group_tournament_id, run_result, submitted_solution)

        :ok

      _ ->
        :ok
    end
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
      :include_bots,
      :last_round_started_at,
      :last_round_ended_at,
      :players_count,
      :group_task_id,
      :template_id,
      :meta
    ])
    |> Map.put(:group_task_slug, group_tournament.group_task && group_tournament.group_task.slug)
  end

  def serialize_run(run) do
    %{
      id: run.id,
      player_ids: run.player_ids,
      status: run.status,
      result: run.result,
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
      score: run.score,
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

  defp can_view_run_details?(current_user, %UserGroupTournamentRun{user_group_tournament: %{user_id: user_id}}) do
    User.admin?(current_user) || current_user.id == user_id
  end

  defp can_view_run_details?(current_user, %UserGroupTournamentRun{}) do
    User.admin?(current_user)
  end

  def broadcast_run_update(group_tournament_or_id, run_result, submitted_solution \\ nil)

  def broadcast_run_update(%GroupTournament{} = group_tournament, {:ok, run}, submitted_solution) do
    payload = %{
      group_tournament_id: group_tournament.id,
      user_id:
        (submitted_solution && submitted_solution.user_id) ||
          (run.user_group_tournament && run.user_group_tournament.user_id) || List.first(run.player_ids),
      run_id: run.id,
      status: run.status,
      score: run.score,
      player_ids: run.player_ids,
      inserted_at: run.inserted_at
    }

    PubSub.broadcast("group_tournament:run_updated", payload)
  end

  def broadcast_run_update(_group_tournament, {:error, _result}, _submitted_solution), do: :ok

  def broadcast_run_update(group_tournament_id, run_result, submitted_solution) when is_integer(group_tournament_id) do
    case get_group_tournament(group_tournament_id) do
      %GroupTournament{} = group_tournament -> broadcast_run_update(group_tournament, run_result, submitted_solution)
      _ -> :ok
    end
  end
end
