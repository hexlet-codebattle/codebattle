defmodule Codebattle.GroupTournament.SliceRunner do
  @moduledoc """
  Slice-based runner for group tournaments.

  Players are partitioned into slices (default size 16) using one of two
  strategies:

    * `"random"` — shuffle, then chunk
    * `"rating"` — sort by `slice_ranking` ascending (nulls last), then chunk

  At slice-run time, only players who have a `GroupTaskSolution` for the
  tournament's task are sent to the runner; players without a submission are
  silently skipped (and an empty slice is skipped entirely).

  Slices execute concurrently via `Task.async_stream/3`, bounded by
  `System.schedulers_online/0`.

  ## Ranked tournaments

  For ranked (`type == "ranked"`) tournaments this module additionally
  provides:

    * `run_seeding/1` — fans out one solo run per player (with bots) so each
      player's baseline score and duration can be persisted before slice
      assignment.
    * `apply_movement/2` — takes the round's per-player results and applies
      the tournament's configured movement strategy to update `slice_index`
      in a single transaction.
  """

  import Ecto.Query

  alias Codebattle.GroupTask.Context, as: GroupTaskContext
  alias Codebattle.GroupTaskSolution
  alias Codebattle.GroupTournament
  alias Codebattle.GroupTournament.Context, as: GroupTournamentContext
  alias Codebattle.GroupTournament.Movement
  alias Codebattle.GroupTournamentPlayer
  alias Codebattle.Repo

  require Logger

  @slice_run_task_timeout_ms 200_000
  @default_max_concurrency 30

  @spec assign_slices(GroupTournament.t()) :: {:ok, non_neg_integer()} | {:error, term()}
  def assign_slices(%GroupTournament{id: id, slice_size: slice_size, slice_strategy: strategy}) do
    players =
      GroupTournamentPlayer
      |> where([p], p.group_tournament_id == ^id and p.state == "active")
      |> Repo.all()

    ordered = order_players(players, strategy)

    Repo.transaction(fn ->
      ordered
      |> Enum.with_index()
      |> Enum.each(fn {player, position} ->
        slice_index = div(position, slice_size)

        GroupTournamentPlayer
        |> where([p], p.id == ^player.id)
        |> Repo.update_all(set: [slice_index: slice_index, updated_at: NaiveDateTime.utc_now()])
      end)

      slice_count(length(ordered), slice_size)
    end)
  end

  @spec run_all_slices(GroupTournament.t(), keyword()) ::
          [{non_neg_integer() | :unknown, :ok | :skipped | {:error, term()}, list(map())}]
  def run_all_slices(%GroupTournament{} = group_tournament, opts \\ []) do
    indices = list_slice_indices(group_tournament.id)
    max_concurrency = Keyword.get(opts, :max_concurrency, configured_max_concurrency())

    indices
    |> Task.async_stream(
      fn slice_index -> run_slice_with_results(group_tournament, slice_index, opts) end,
      max_concurrency: max_concurrency,
      timeout: @slice_run_task_timeout_ms,
      on_timeout: :kill_task,
      ordered: false
    )
    |> Enum.map(fn
      {:ok, result} -> result
      {:exit, reason} -> {:unknown, {:error, {:exit, reason}}, []}
    end)
  end

  defp run_slice_with_results(group_tournament, slice_index, opts) do
    case run_slice(group_tournament, slice_index, opts) do
      {:ok, round_results} -> {slice_index, :ok, round_results}
      :skipped -> {slice_index, :skipped, []}
      {:error, reason} -> {slice_index, {:error, reason}, []}
    end
  end

  @spec run_slice(GroupTournament.t(), non_neg_integer(), keyword()) ::
          {:ok, list(map())} | :skipped | {:error, term()}
  def run_slice(%GroupTournament{} = group_tournament, slice_index, _opts \\ []) do
    player_ids = list_slice_player_ids(group_tournament.id, slice_index)
    submitted_ids = list_player_ids_with_solution(group_tournament, player_ids)

    case submitted_ids do
      [] ->
        :skipped

      ids ->
        result =
          GroupTaskContext.run_group_task(group_tournament.group_task, ids, %{
            group_tournament_id: group_tournament.id,
            include_bots: include_bots_for_slice?(group_tournament, ids),
            slice_index: slice_index,
            kind: :slice
          })

        GroupTournamentContext.broadcast_run_update(group_tournament, result)

        case result do
          {:ok, run} ->
            {:ok, build_round_results(run, ids, slice_index)}

          {:error, changeset} ->
            {:error, changeset}
        end
    end
  end

  @doc """
  Runs the seeding round for a ranked tournament: each active player runs solo
  against bots so we can persist their baseline score + duration. This is what
  drives the initial slice assignment (via `assign_slices/1` with strategy
  `"rating"`).
  """
  @spec run_seeding(GroupTournament.t(), keyword()) ::
          [{integer(), :ok | :skipped | {:error, term()}}]
  def run_seeding(%GroupTournament{} = group_tournament, opts \\ []) do
    player_ids = list_active_player_ids(group_tournament.id)
    max_concurrency = Keyword.get(opts, :max_concurrency, configured_max_concurrency())

    submitted_ids = list_player_ids_with_solution(group_tournament, player_ids)

    submitted_ids
    |> Task.async_stream(
      fn user_id -> {user_id, run_seed_for_player(group_tournament, user_id)} end,
      max_concurrency: max_concurrency,
      timeout: @slice_run_task_timeout_ms,
      on_timeout: :kill_task,
      ordered: false
    )
    |> Enum.map(fn
      {:ok, result} -> result
      {:exit, reason} -> {:unknown, {:error, {:exit, reason}}}
    end)
  end

  @doc """
  Applies the tournament's configured movement strategy to update each
  player's `slice_index` based on the round's results. Returns
  `{:ok, slice_count}` on success.

  `round_results` is the list of `%{user_id, slice_index, place}` produced
  by the slice runs of the round that just ended.
  """
  @spec apply_movement(GroupTournament.t(), [Movement.round_result()]) ::
          {:ok, non_neg_integer()} | {:error, term()}
  def apply_movement(%GroupTournament{} = group_tournament, round_results) do
    movement_opts = %{
      slice_count: group_tournament.slice_count || 0,
      slice_size: group_tournament.slice_size
    }

    assignments = Movement.reassign(group_tournament.movement_strategy, round_results, movement_opts)

    Repo.transaction(fn ->
      assignments
      |> Enum.group_by(& &1.new_slice_index, & &1.user_id)
      |> Enum.each(fn {new_slice_index, user_ids} ->
        GroupTournamentPlayer
        |> where(
          [p],
          p.group_tournament_id == ^group_tournament.id and p.user_id in ^user_ids
        )
        |> Repo.update_all(set: [slice_index: new_slice_index, updated_at: NaiveDateTime.utc_now()])
      end)

      Map.new(assignments, &{&1.user_id, &1.new_slice_index})
    end)
  end

  defp build_round_results(run, ids, slice_index) do
    run
    |> GroupTaskContext.extract_round_results()
    |> Enum.filter(fn r -> r.user_id in ids end)
    |> Enum.map(fn r -> Map.put(r, :slice_index, slice_index) end)
  end

  defp run_seed_for_player(%GroupTournament{} = group_tournament, user_id) do
    started_at = System.monotonic_time(:millisecond)

    result =
      GroupTaskContext.run_group_task(group_tournament.group_task, [user_id], %{
        group_tournament_id: group_tournament.id,
        include_bots: true,
        kind: :seed
      })

    duration_ms = System.monotonic_time(:millisecond) - started_at

    case result do
      {:ok, run} ->
        persist_seed(group_tournament.id, user_id, run.score, run.duration_ms || duration_ms)
        GroupTournamentContext.broadcast_run_update(group_tournament, {:ok, run})
        :ok

      {:error, _} = err ->
        err
    end
  end

  defp persist_seed(group_tournament_id, user_id, score, duration_ms) do
    GroupTournamentPlayer
    |> where([p], p.group_tournament_id == ^group_tournament_id and p.user_id == ^user_id)
    |> Repo.update_all(
      set: [
        seed_score: score,
        seed_duration_ms: duration_ms,
        slice_ranking: seed_ranking(score, duration_ms),
        updated_at: NaiveDateTime.utc_now()
      ]
    )
  end

  # Lower slice_ranking sorts first under the "rating" strategy (ascending).
  # We want highest score first → use -score. We then add a small duration
  # factor (in microseconds-fitting integers) as a tie-break so faster
  # submissions outrank slower ones at the same score.
  defp seed_ranking(nil, _duration), do: nil
  defp seed_ranking(score, nil), do: -score * 1_000_000
  defp seed_ranking(score, duration_ms), do: -score * 1_000_000 + duration_ms

  # Pad short slices with bots so a slice always plays against a full field of
  # `slice_size` participants. A fully-populated slice (all humans submitted)
  # runs without bots — humans race only each other.
  defp include_bots_for_slice?(%GroupTournament{slice_size: slice_size}, ids)
       when is_integer(slice_size) and slice_size > 0 do
    length(ids) < slice_size
  end

  defp include_bots_for_slice?(_, _), do: false

  defp order_players(players, "rating") do
    Enum.sort_by(players, fn player ->
      ranking = player.slice_ranking
      {is_nil(ranking), ranking || 0, player.id}
    end)
  end

  defp order_players(players, _random_or_unknown) do
    Enum.shuffle(players)
  end

  defp slice_count(0, _slice_size), do: 0
  defp slice_count(total, slice_size), do: div(total - 1, slice_size) + 1

  defp list_slice_indices(group_tournament_id) do
    GroupTournamentPlayer
    |> where([p], p.group_tournament_id == ^group_tournament_id and not is_nil(p.slice_index))
    |> distinct(true)
    |> select([p], p.slice_index)
    |> order_by([p], asc: p.slice_index)
    |> Repo.all()
  end

  defp list_slice_player_ids(group_tournament_id, slice_index) do
    GroupTournamentPlayer
    |> where(
      [p],
      p.group_tournament_id == ^group_tournament_id and
        p.slice_index == ^slice_index and
        p.state == "active"
    )
    |> select([p], p.user_id)
    |> Repo.all()
  end

  defp list_active_player_ids(group_tournament_id) do
    GroupTournamentPlayer
    |> where([p], p.group_tournament_id == ^group_tournament_id and p.state == "active")
    |> select([p], p.user_id)
    |> Repo.all()
  end

  defp configured_max_concurrency do
    Application.get_env(:codebattle, :group_tournament_slice_run_concurrency, @default_max_concurrency)
  end

  defp list_player_ids_with_solution(_group_tournament, []), do: []

  defp list_player_ids_with_solution(%GroupTournament{} = group_tournament, player_ids) do
    GroupTaskSolution
    |> where(
      [s],
      s.group_task_id == ^group_tournament.group_task_id and
        s.group_tournament_id == ^group_tournament.id and
        s.user_id in ^player_ids
    )
    |> distinct([s], s.user_id)
    |> select([s], s.user_id)
    |> Repo.all()
  end
end
