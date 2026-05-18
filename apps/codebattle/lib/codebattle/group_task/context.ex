defmodule Codebattle.GroupTask.Context do
  @moduledoc false

  import Ecto.Query

  alias Codebattle.GroupTask
  alias Codebattle.GroupTaskSolution
  alias Codebattle.GroupTournament
  alias Codebattle.GroupTournament.Scoring
  alias Codebattle.GroupTournamentPlayer
  alias Codebattle.GroupTournamentRoundScore
  alias Codebattle.Repo
  alias Codebattle.UserGroupTournament
  alias Codebattle.UserGroupTournamentRun

  require Logger

  @group_task_runner_receive_timeout_ms 180_000
  @group_task_runner_connect_timeout_ms 30_000

  @admin_recent_solutions_limit 100

  @spec list_group_tasks() :: list(GroupTask.t())
  def list_group_tasks do
    GroupTask
    |> order_by([gt], asc: gt.slug)
    |> Repo.all()
  end

  @spec get_group_task!(String.t() | pos_integer()) :: GroupTask.t()
  def get_group_task!(id) do
    Repo.get!(GroupTask, id)
  end

  @spec get_group_task(String.t() | pos_integer()) :: GroupTask.t() | nil
  def get_group_task(id) do
    Repo.get(GroupTask, id)
  end

  @spec create_group_task(map()) :: {:ok, GroupTask.t()} | {:error, Ecto.Changeset.t()}
  def create_group_task(attrs) do
    %GroupTask{}
    |> GroupTask.changeset(attrs)
    |> Repo.insert()
  end

  @spec update_group_task(GroupTask.t(), map()) :: {:ok, GroupTask.t()} | {:error, Ecto.Changeset.t()}
  def update_group_task(group_task, attrs) do
    group_task
    |> GroupTask.changeset(attrs)
    |> Repo.update()
  end

  @spec delete_group_task(GroupTask.t()) :: {:ok, GroupTask.t()} | {:error, Ecto.Changeset.t()}
  def delete_group_task(group_task) do
    Repo.delete(group_task)
  end

  @spec change_group_task(GroupTask.t(), map()) :: Ecto.Changeset.t()
  def change_group_task(group_task, attrs \\ %{}) do
    GroupTask.changeset(group_task, attrs)
  end

  @spec list_solutions(GroupTask.t() | pos_integer(), keyword()) :: list(GroupTaskSolution.t())
  def list_solutions(group_task_or_id, opts \\ [])
  def list_solutions(%GroupTask{id: group_task_id}, opts), do: list_solutions(group_task_id, opts)

  def list_solutions(group_task_id, opts) do
    limit = Keyword.get(opts, :limit, @admin_recent_solutions_limit)
    group_tournament_id = Keyword.get(opts, :group_tournament_id)

    GroupTaskSolution
    |> where([solution], solution.group_task_id == ^group_task_id)
    |> maybe_filter_by_group_tournament(group_tournament_id)
    |> preload(:user)
    |> order_by([solution], desc: solution.inserted_at, desc: solution.id)
    |> limit(^limit)
    |> Repo.all()
  end

  @spec get_solution!(String.t() | pos_integer()) :: GroupTaskSolution.t()
  def get_solution!(id) do
    Repo.get!(GroupTaskSolution, id)
  end

  @spec get_latest_solution(pos_integer(), pos_integer(), keyword()) :: GroupTaskSolution.t() | nil
  def get_latest_solution(group_task_id, user_id, opts \\ []) do
    group_tournament_id = Keyword.get(opts, :group_tournament_id)

    GroupTaskSolution
    |> where([solution], solution.group_task_id == ^group_task_id and solution.user_id == ^user_id)
    |> maybe_filter_by_group_tournament(group_tournament_id)
    |> preload(:user)
    |> order_by([solution], desc: solution.id)
    |> limit(1)
    |> Repo.one()
  end

  @spec list_user_solutions(pos_integer(), pos_integer(), keyword()) :: list(GroupTaskSolution.t())
  def list_user_solutions(group_task_id, user_id, opts \\ []) do
    limit = Keyword.get(opts, :limit, @admin_recent_solutions_limit)
    group_tournament_id = Keyword.get(opts, :group_tournament_id)

    GroupTaskSolution
    |> where([solution], solution.group_task_id == ^group_task_id and solution.user_id == ^user_id)
    |> maybe_filter_by_group_tournament(group_tournament_id)
    |> preload(:user)
    |> order_by([solution], desc: solution.inserted_at, desc: solution.id)
    |> limit(^limit)
    |> Repo.all()
  end

  @spec create_solution(pos_integer(), pos_integer(), map()) ::
          {:ok, GroupTaskSolution.t()} | {:error, Ecto.Changeset.t()}
  def create_solution(group_task_id, user_id, attrs) do
    params = %{
      user_id: user_id,
      group_task_id: group_task_id,
      group_tournament_id: Map.get(attrs, "group_tournament_id") || Map.get(attrs, :group_tournament_id),
      lang: Map.get(attrs, "lang") || Map.get(attrs, :lang),
      solution: Map.get(attrs, "solution") || Map.get(attrs, :solution)
    }

    %GroupTaskSolution{}
    |> GroupTaskSolution.changeset(params)
    |> Repo.insert()
  end

  @spec create_solution_from_submission(pos_integer(), pos_integer(), map()) ::
          {:ok, GroupTaskSolution.t()} | {:error, Ecto.Changeset.t()}
  def create_solution_from_submission(group_task_id, user_id, attrs) do
    params = %{
      user_id: user_id,
      group_task_id: group_task_id,
      group_tournament_id: Map.get(attrs, "group_tournament_id") || Map.get(attrs, :group_tournament_id),
      lang: Map.get(attrs, "lang") || Map.get(attrs, :lang)
    }

    case decode_solution(Map.get(attrs, "solution") || Map.get(attrs, :solution)) do
      {:ok, decoded_solution} ->
        %GroupTaskSolution{}
        |> GroupTaskSolution.changeset(Map.put(params, :solution, decoded_solution))
        |> Repo.insert()

      :error ->
        {:error, invalid_solution_encoding_changeset(params)}
    end
  end

  @spec list_latest_solutions(pos_integer(), list(pos_integer()), keyword()) :: list(GroupTaskSolution.t())
  def list_latest_solutions(group_task_id, player_ids, opts \\ []) do
    do_list_latest_solutions(group_task_id, player_ids, opts)
  end

  @spec change_solution(GroupTaskSolution.t(), map()) :: Ecto.Changeset.t()
  def change_solution(solution, attrs \\ %{}) do
    GroupTaskSolution.changeset(solution, attrs)
  end

  @spec update_solution(GroupTaskSolution.t(), map()) ::
          {:ok, GroupTaskSolution.t()} | {:error, Ecto.Changeset.t()}
  def update_solution(solution, attrs) do
    solution
    |> GroupTaskSolution.changeset(attrs)
    |> Repo.update()
  end

  @spec delete_solution(GroupTaskSolution.t()) ::
          {:ok, GroupTaskSolution.t()} | {:error, Ecto.Changeset.t()}
  def delete_solution(solution) do
    Repo.delete(solution)
  end

  @spec get_run!(String.t() | pos_integer()) :: UserGroupTournamentRun.t()
  def get_run!(id) do
    Repo.get!(UserGroupTournamentRun, id)
  end

  @spec get_run_with_solution!(String.t() | pos_integer()) ::
          %{run: UserGroupTournamentRun.t(), solution: GroupTaskSolution.t() | nil}
  def get_run_with_solution!(id) do
    run =
      UserGroupTournamentRun
      |> where([run], run.id == ^id)
      |> preload(:user_group_tournament)
      |> Repo.one!()

    solution = get_run_solution(run)

    %{run: run, solution: solution}
  end

  @spec run_group_task(GroupTask.t(), list(pos_integer()), map()) ::
          {:ok, UserGroupTournamentRun.t()} | {:error, Ecto.Changeset.t()}
  def run_group_task(%GroupTask{} = group_task, player_ids, attrs \\ %{}) do
    normalized_player_ids = normalize_player_ids(player_ids)
    group_tournament_id = Map.get(attrs, :group_tournament_id) || Map.get(attrs, "group_tournament_id")
    slice_index = Map.get(attrs, :slice_index) || Map.get(attrs, "slice_index")
    kind = normalize_kind(Map.get(attrs, :kind) || Map.get(attrs, "kind"))

    run_ctx = %{
      group_tournament_id: group_tournament_id,
      run_key: Ecto.UUID.generate(),
      slice_index: slice_index,
      kind: kind
    }

    case create_pending_runs(group_task, normalized_player_ids, run_ctx) do
      {:ok, runs} ->
        case build_run_payload(group_task, normalized_player_ids, attrs) do
          {:ok, payload} ->
            run_result = execute_run(group_task.runner_url, payload)
            persist_group_task_run_result(runs, group_task, normalized_player_ids, run_result, run_ctx)

          {:run_error, result} ->
            persist_group_task_run_result(runs, group_task, normalized_player_ids, {:run_error, result}, run_ctx)
        end

      {:error, %Ecto.Changeset{} = changeset} ->
        {:error, changeset}
    end
  end

  @doc """
  Extracts per-player round results (`%{user_id, place, score, duration_ms}`)
  from a stored run's `result` map. Used by SliceRunner to feed movement.
  Returns `[]` if the run has no ranking (error/pending/empty).
  """
  @spec extract_round_results(UserGroupTournamentRun.t()) :: [
          %{user_id: integer(), place: pos_integer(), score: integer() | nil, duration_ms: integer() | nil}
        ]
  def extract_round_results(%UserGroupTournamentRun{result: result}) do
    result
    |> extract_ranking()
    |> Enum.flat_map(fn entry ->
      case entry do
        %{"player_id" => user_id, "place" => place}
        when is_integer(user_id) and is_integer(place) and place >= 1 ->
          [
            %{
              user_id: user_id,
              place: place,
              score: numeric(entry["score"]),
              duration_ms: numeric(entry["duration_ms"])
            }
          ]

        _ ->
          []
      end
    end)
  end

  defp decode_solution(solution) when is_binary(solution) do
    case Base.decode64(String.trim(solution)) do
      {:ok, decoded_solution} -> {:ok, decoded_solution}
      :error -> :error
    end
  end

  defp decode_solution(_solution), do: :error

  defp get_run_solution(%UserGroupTournamentRun{user_group_tournament: %{user_id: user_id}} = run) do
    GroupTaskSolution
    |> where(
      [solution],
      solution.group_task_id == ^run.group_task_id and
        solution.group_tournament_id == ^run.group_tournament_id and
        solution.user_id == ^user_id and
        solution.inserted_at <= ^run.inserted_at
    )
    |> preload(:user)
    |> order_by([solution], desc: solution.inserted_at, desc: solution.id)
    |> limit(1)
    |> Repo.one()
  end

  defp get_run_solution(_run), do: nil

  defp invalid_solution_encoding_changeset(params) do
    %GroupTaskSolution{}
    |> GroupTaskSolution.changeset(Map.put(params, :solution, "placeholder"))
    |> Ecto.Changeset.delete_change(:solution)
    |> Ecto.Changeset.add_error(:solution, "is invalid base64")
  end

  defp build_run_payload(%GroupTask{} = group_task, player_ids, attrs) do
    latest_solutions =
      do_list_latest_solutions(group_task.id, player_ids,
        group_tournament_id: Map.get(attrs, :group_tournament_id) || Map.get(attrs, "group_tournament_id")
      )

    solution_user_ids = MapSet.new(Enum.map(latest_solutions, & &1.user_id))
    missing_player_ids = Enum.reject(player_ids, &MapSet.member?(solution_user_ids, &1))

    if missing_player_ids == [] do
      {:ok,
       %{
         include_bots: Map.get(attrs, :include_bots) || Map.get(attrs, "include_bots") || false,
         include_viewer_html: true,
         solutions:
           Enum.map(latest_solutions, fn solution ->
             %{
               lang: solution.lang,
               name: solution.user && solution.user.name,
               player_id: solution.user_id,
               solution: solution.solution
             }
           end)
       }}
    else
      {:run_error,
       %{
         "error" => "solutions_not_found",
         "missing_player_ids" => missing_player_ids
       }}
    end
  end

  defp execute_run(nil, _payload), do: {:run_error, %{"error" => "runner_url_not_configured"}}
  defp execute_run("", _payload), do: {:run_error, %{"error" => "runner_url_not_configured"}}

  defp execute_run(runner_url, payload) do
    request_url = build_runner_run_url(runner_url)

    Logger.debug(fn ->
      "GroupTask runner request url=#{request_url} payload=#{inspect(payload, pretty: true, limit: :infinity)}"
    end)

    case runner_http_client().post(request_url,
           json: payload,
           headers: [{"content-type", "application/json"}],
           receive_timeout: @group_task_runner_receive_timeout_ms,
           connect_options: [timeout: @group_task_runner_connect_timeout_ms]
         ) do
      {:ok, %Req.Response{status: 200, body: body}} ->
        result = normalize_result_body(body)

        Logger.debug(fn ->
          "GroupTask runner success url=#{request_url} result=#{inspect(result, pretty: true, limit: :infinity)}"
        end)

        {:ok, result}

      {:ok, %Req.Response{status: status, body: body}} ->
        result = %{
          "error" => "runner_request_failed",
          "status" => status,
          "body" => normalize_result_body(body)
        }

        Logger.debug(fn ->
          "GroupTask runner failure url=#{request_url} result=#{inspect(result, pretty: true, limit: :infinity)}"
        end)

        {:run_error, result}

      {:error, reason} ->
        result = %{
          "error" => "runner_request_failed",
          "reason" => inspect(reason)
        }

        Logger.debug(fn ->
          "GroupTask runner transport failure url=#{request_url} result=#{inspect(result, pretty: true, limit: :infinity)}"
        end)

        {:run_error, result}
    end
  end

  defp do_list_latest_solutions(group_task_id, player_ids, opts) do
    group_tournament_id = Keyword.get(opts, :group_tournament_id)

    GroupTaskSolution
    |> where([solution], solution.group_task_id == ^group_task_id and solution.user_id in ^player_ids)
    |> maybe_filter_by_group_tournament(group_tournament_id)
    |> preload(:user)
    |> distinct([solution], solution.user_id)
    |> order_by([solution], asc: solution.user_id, desc: solution.id)
    |> Repo.all()
  end

  defp maybe_filter_by_group_tournament(query, nil), do: query

  defp maybe_filter_by_group_tournament(query, group_tournament_id) do
    where(query, [solution], solution.group_tournament_id == ^group_tournament_id)
  end

  defp normalize_player_ids(player_ids) do
    player_ids
    |> Enum.filter(&(is_integer(&1) and &1 > 0))
    |> Enum.uniq()
    |> Enum.sort()
  end

  defp normalize_kind(kind) when kind in [:slice, "slice"], do: "slice"
  defp normalize_kind(kind) when kind in [:seed, "seed"], do: "seed"
  defp normalize_kind(_), do: "user"

  defp create_pending_runs(_group_task, _player_ids, %{group_tournament_id: nil}), do: {:ok, []}

  defp create_pending_runs(
         %GroupTask{id: group_task_id},
         player_ids,
         %{group_tournament_id: group_tournament_id} = run_ctx
       ) do
    runs_by_user_id =
      UserGroupTournament
      |> where(
        [record],
        record.group_tournament_id == ^group_tournament_id and record.user_id in ^player_ids
      )
      |> Repo.all()
      |> Map.new(&{&1.user_id, &1})

    missing_player_ids = Enum.reject(player_ids, &Map.has_key?(runs_by_user_id, &1))

    if missing_player_ids == [] do
      inserted_runs = do_create_pending_runs(player_ids, runs_by_user_id, group_task_id, run_ctx)

      case inserted_runs do
        {:ok, runs} -> {:ok, runs}
        {:error, changeset} -> {:error, changeset}
      end
    else
      {:error,
       %UserGroupTournamentRun{}
       |> Ecto.Changeset.change()
       |> Ecto.Changeset.add_error(
         :player_ids,
         "are not linked to the group tournament: #{Enum.join(missing_player_ids, ", ")}"
       )}
    end
  end

  defp persist_group_task_run_result(runs, group_task, player_ids, run_outcome, run_ctx) do
    {status, result} =
      case run_outcome do
        {:ok, result} -> {"success", result}
        {:run_error, result} -> {"error", result}
      end

    persist_run_result(runs, group_task, player_ids, status, result, run_ctx)
  end

  defp persist_run_result([], group_task, player_ids, status, result, run_ctx) do
    {:ok,
     %UserGroupTournamentRun{
       group_task_id: group_task.id,
       group_tournament_id: run_ctx.group_tournament_id,
       run_key: run_ctx.run_key,
       player_ids: player_ids,
       status: status,
       result: result,
       inserted_at: NaiveDateTime.utc_now()
     }}
  end

  defp persist_run_result(runs, _group_task, _player_ids, status, result, run_ctx) do
    updated_runs = do_update_runs(runs, status, result, run_ctx.group_tournament_id, run_ctx.slice_index, run_ctx.kind)

    case updated_runs do
      {:ok, [representative_run | _]} -> {:ok, representative_run}
      {:error, changeset} -> {:error, changeset}
    end
  end

  defp do_create_pending_runs(player_ids, runs_by_user_id, group_task_id, run_ctx) do
    Repo.transaction(fn ->
      player_ids
      |> Enum.reduce_while([], fn player_id, acc ->
        create_pending_run(player_id, acc, player_ids, runs_by_user_id, group_task_id, run_ctx)
      end)
      |> Enum.reverse()
    end)
  end

  defp do_update_runs(runs, status, result, group_tournament_id, slice_index, kind) do
    ranking = extract_ranking(result)
    tournament = load_tournament(group_tournament_id)
    round_position = round_position_for_run(tournament, kind)

    Repo.transaction(fn ->
      updated =
        runs
        |> Repo.preload(:user_group_tournament)
        |> Enum.reduce_while([], fn run, acc ->
          update_run(run, acc, status, result, ranking, round_position)
        end)
        |> Enum.reverse()

      apply_tournament_scoring(tournament, updated, ranking, slice_index, kind)

      updated
    end)
  end

  defp round_position_for_run(%GroupTournament{current_round_position: pos}, kind)
       when kind in ["slice", "seed"] and is_integer(pos), do: pos

  defp round_position_for_run(_tournament, _kind), do: nil

  defp load_tournament(nil), do: nil
  defp load_tournament(group_tournament_id), do: Repo.get(GroupTournament, group_tournament_id)

  # Scoring branches on tournament type and run kind.
  # - individual tournament: total_score = max(current, run_score)
  # - ranked + :slice: round_points via scoring strategy, increment total_score
  # - ranked + :seed (or anything else): no-op here. The seed flow uses
  #   SliceRunner.run_seeding/1 which persists seed_score/seed_duration_ms
  #   separately and never touches total_score.
  defp apply_tournament_scoring(nil, _runs, _ranking, _slice_index, _kind), do: :ok
  defp apply_tournament_scoring(_tournament, _runs, _ranking, _slice_index, "seed"), do: :ok
  defp apply_tournament_scoring(_tournament, [], _ranking, _slice_index, _kind), do: :ok

  defp apply_tournament_scoring(%GroupTournament{type: "ranked"} = tournament, runs, _ranking, slice_index, _kind)
       when is_integer(slice_index) do
    opts = %{
      slice_count: tournament.slice_count || 0,
      slice_size: tournament.slice_size,
      max_score: tournament.max_score || 0,
      place_weight: tournament.place_weight || 1
    }

    round_position = tournament.current_round_position

    runs
    |> Enum.map(fn run ->
      user_id = run.user_group_tournament && run.user_group_tournament.user_id
      place = extract_place_for_user(_user_ranking(run), user_id)
      {user_id, place, run.id}
    end)
    |> Enum.filter(fn {user_id, place, _} -> is_integer(user_id) and is_integer(place) end)
    |> Enum.each(fn {user_id, place, run_id} ->
      round_points = Scoring.round_points(tournament.scoring_strategy, slice_index, place, opts)
      bump_player_score(tournament.id, user_id, round_points, place)
      record_round_score(tournament.id, user_id, run_id, round_position, slice_index, place, round_points)
    end)
  end

  defp apply_tournament_scoring(%GroupTournament{type: "individual"} = tournament, runs, _ranking, _slice_index, _kind) do
    Enum.each(runs, fn run ->
      user_id = run.user_group_tournament && run.user_group_tournament.user_id
      run_score = run.score

      if is_integer(user_id) and is_integer(run_score) do
        raise_to_max_score(tournament.id, user_id, run_score)
      end
    end)
  end

  defp apply_tournament_scoring(_tournament, _runs, _ranking, _slice_index, _kind), do: :ok

  # Each preloaded run carries the FULL ranking on its `result` field — we
  # don't need to scan it per-run, but the helper keeps the shape consistent.
  defp _user_ranking(%UserGroupTournamentRun{result: result}), do: extract_ranking(result)

  defp bump_player_score(group_tournament_id, user_id, round_points, place) do
    {count, _} =
      GroupTournamentPlayer
      |> where(
        [p],
        p.group_tournament_id == ^group_tournament_id and p.user_id == ^user_id
      )
      |> update(
        [p],
        set: [
          total_score: fragment("COALESCE(?, 0) + ?", p.total_score, ^round_points),
          last_round_place: ^place,
          consecutive_zero_rounds:
            fragment(
              "CASE WHEN ? > 0 THEN 0 ELSE COALESCE(?, 0) + 1 END",
              ^round_points,
              p.consecutive_zero_rounds
            ),
          updated_at: ^NaiveDateTime.utc_now()
        ]
      )
      |> Repo.update_all([])

    count
  end

  defp record_round_score(_tid, _uid, _run_id, nil, _slice, _place, _points), do: :ok

  defp record_round_score(tournament_id, user_id, run_id, round_position, slice_index, place, points) do
    %GroupTournamentRoundScore{}
    |> GroupTournamentRoundScore.changeset(%{
      group_tournament_id: tournament_id,
      user_id: user_id,
      run_id: run_id,
      round_position: round_position,
      slice_index: slice_index,
      place: place,
      score: points
    })
    |> Repo.insert(
      on_conflict: {:replace, [:run_id, :slice_index, :place, :score, :updated_at]},
      conflict_target: [:group_tournament_id, :user_id, :round_position]
    )
  end

  defp raise_to_max_score(group_tournament_id, user_id, run_score) do
    GroupTournamentPlayer
    |> where(
      [p],
      p.group_tournament_id == ^group_tournament_id and p.user_id == ^user_id
    )
    |> update(
      [p],
      set: [
        total_score: fragment("GREATEST(COALESCE(?, 0), ?)", p.total_score, ^run_score),
        updated_at: ^NaiveDateTime.utc_now()
      ]
    )
    |> Repo.update_all([])
  end

  defp extract_place_for_user([], _user_id), do: nil
  defp extract_place_for_user(_ranking, nil), do: nil

  defp extract_place_for_user(ranking, user_id) do
    case Enum.find(ranking, fn entry -> entry["player_id"] == user_id end) do
      %{"place" => place} when is_integer(place) -> place
      _ -> nil
    end
  end

  defp numeric(v) when is_integer(v), do: v
  defp numeric(v) when is_float(v), do: round(v)
  defp numeric(_), do: nil

  defp create_pending_run(player_id, acc, player_ids, runs_by_user_id, group_task_id, run_ctx) do
    user_group_tournament = Map.fetch!(runs_by_user_id, player_id)

    %UserGroupTournamentRun{}
    |> UserGroupTournamentRun.changeset(%{
      user_group_tournament_id: user_group_tournament.id,
      group_task_id: group_task_id,
      group_tournament_id: run_ctx.group_tournament_id,
      run_key: run_ctx.run_key,
      player_ids: player_ids,
      slice_index: run_ctx.slice_index,
      kind: run_ctx.kind,
      status: "pending",
      result: %{}
    })
    |> Repo.insert()
    |> maybe_continue_transaction(acc)
  end

  defp update_run(run, acc, status, result, ranking, round_position) do
    user_id = run.user_group_tournament.user_id
    score = extract_score_for_user(ranking, user_id)
    duration_ms = extract_duration_for_user(ranking, user_id)

    attrs =
      %{status: status, result: result, score: score}
      |> maybe_put(:duration_ms, duration_ms)
      |> maybe_put(:round_position, round_position)

    run
    |> UserGroupTournamentRun.changeset(attrs)
    |> Repo.update()
    |> maybe_continue_transaction(acc)
  end

  defp maybe_put(map, _key, nil), do: map
  defp maybe_put(map, key, value), do: Map.put(map, key, value)

  defp extract_duration_for_user(ranking, user_id) do
    case Enum.find(ranking, fn entry -> entry["player_id"] == user_id end) do
      %{"duration_ms" => v} when is_integer(v) -> v
      %{"duration_ms" => v} when is_float(v) -> round(v)
      _ -> nil
    end
  end

  defp extract_ranking(%{"summary" => %{"ranking" => ranking}}) when is_list(ranking), do: ranking
  defp extract_ranking(_), do: []

  defp extract_score_for_user([], _user_id), do: nil

  defp extract_score_for_user(ranking, user_id) do
    case Enum.find(ranking, fn entry -> entry["player_id"] == user_id end) do
      %{"score" => score} when is_integer(score) -> score
      _ -> nil
    end
  end

  defp maybe_continue_transaction({:ok, run}, acc), do: {:cont, [run | acc]}
  defp maybe_continue_transaction({:error, changeset}, _acc), do: Repo.rollback(changeset)

  defp normalize_result_body(body) when is_map(body), do: body
  defp normalize_result_body(body), do: %{"body" => body}

  defp build_runner_run_url(runner_url) do
    trimmed_runner_url =
      runner_url
      |> String.trim()
      |> String.trim_trailing("/")

    if String.ends_with?(trimmed_runner_url, "/run") do
      trimmed_runner_url
    else
      trimmed_runner_url <> "/run"
    end
  end

  defp runner_http_client do
    Application.get_env(:codebattle, :group_task_runner_http_client, Req)
  end
end
