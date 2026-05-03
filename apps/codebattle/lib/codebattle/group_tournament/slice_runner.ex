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
  """

  import Ecto.Query

  alias Codebattle.GroupTask.Context, as: GroupTaskContext
  alias Codebattle.GroupTaskSolution
  alias Codebattle.GroupTournament
  alias Codebattle.GroupTournament.Context, as: GroupTournamentContext
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
          [{non_neg_integer() | :unknown, :ok | :skipped | {:error, term()}}]
  def run_all_slices(%GroupTournament{} = group_tournament, opts \\ []) do
    indices = list_slice_indices(group_tournament.id)
    max_concurrency = Keyword.get(opts, :max_concurrency, configured_max_concurrency())

    indices
    |> Task.async_stream(
      fn slice_index -> {slice_index, run_slice(group_tournament, slice_index, opts)} end,
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

  @spec run_slice(GroupTournament.t(), non_neg_integer(), keyword()) ::
          :ok | :skipped | {:error, term()}
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
            include_bots: group_tournament.include_bots
          })

        GroupTournamentContext.broadcast_run_update(group_tournament, result)

        case result do
          {:ok, _run} -> :ok
          {:error, changeset} -> {:error, changeset}
        end
    end
  end

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
