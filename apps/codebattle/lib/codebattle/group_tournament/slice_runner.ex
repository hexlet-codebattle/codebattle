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

    * `run_seeding/2` — reads each active player's latest successful
      preview run for round 1 and persists its score / submission duration
      as `seed_score` / `seed_duration_ms`. The seed round IS the bot
      fight: the score the player earned against bots during the round
      becomes the official seed score, with no extra runner work at
      round end.
    * `apply_movement/2` — takes the round's per-player results and applies
      the tournament's configured movement strategy to update `slice_index`
      in a single transaction.
  """

  import Ecto.Query

  alias Codebattle.GroupTask.Context, as: GroupTaskContext
  alias Codebattle.GroupTaskSolution
  alias Codebattle.GroupTournament
  alias Codebattle.GroupTournament.Movement
  alias Codebattle.GroupTournamentPlayer
  alias Codebattle.GroupTournamentRoundScore
  alias Codebattle.Repo
  alias Codebattle.UserGroupTournamentRun

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

  defp solutions_before_opt(opts), do: Keyword.get(opts, :solutions_before)

  @doc """
  Per-submission preview against the submitter's slice. Runs every
  slice-mate's latest solution together with the submitter's so the
  submitter sees how their new submission ranks within their slice in
  real time.

  Returns `:no_slice` if the player has no `slice_index` yet — caller
  should fall back to a solo run.

  Tournament scoring is intentionally skipped: this passes the run with
  `slice_index: nil` so `apply_tournament_scoring` no-ops for ranked
  tournaments. Official scoring still comes from `run_all_slices/2` at
  round-end.
  """
  @spec run_slice_preview(GroupTournament.t(), pos_integer()) ::
          :ok | :skipped | :no_slice | {:error, term()}
  def run_slice_preview(%GroupTournament{} = group_tournament, user_id) do
    case get_player_slice_index(group_tournament.id, user_id) do
      nil -> :no_slice
      slice_index -> do_run_slice_preview(group_tournament, slice_index)
    end
  end

  defp do_run_slice_preview(%GroupTournament{} = group_tournament, slice_index) do
    player_ids = list_slice_player_ids(group_tournament.id, slice_index)
    submitted_ids = list_player_ids_with_solution(group_tournament, player_ids, nil)

    case submitted_ids do
      [] ->
        :skipped

      ids ->
        result =
          GroupTaskContext.run_group_task(group_tournament.group_task, ids, %{
            group_tournament_id: group_tournament.id,
            include_bots: include_bots_for_slice?(group_tournament, ids, slice_index),
            round: group_tournament.current_round_position || 1
          })

        case result do
          {:ok, _run} -> :ok
          {:error, _} = err -> err
        end
    end
  end

  defp get_player_slice_index(group_tournament_id, user_id) do
    GroupTournamentPlayer
    |> where([p], p.group_tournament_id == ^group_tournament_id and p.user_id == ^user_id)
    |> select([p], p.slice_index)
    |> Repo.one()
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
  def run_slice(%GroupTournament{} = group_tournament, slice_index, opts \\ []) do
    cutoff = solutions_before_opt(opts)
    player_ids = list_slice_player_ids(group_tournament.id, slice_index)
    submitted_ids = list_player_ids_with_solution(group_tournament, player_ids, cutoff)

    case submitted_ids do
      [] ->
        :skipped

      ids ->
        result =
          GroupTaskContext.run_group_task(group_tournament.group_task, ids, %{
            group_tournament_id: group_tournament.id,
            include_bots: include_bots_for_slice?(group_tournament, ids, slice_index),
            slice_index: slice_index,
            kind: :slice,
            round: group_tournament.current_round_position || 1,
            solutions_before: cutoff
          })

        # run_group_task now broadcasts a per-user "run_updated" event for
        # every persisted row, so each player sees their own run_id and score.

        case result do
          {:ok, run} ->
            {:ok, build_round_results(run, ids, slice_index)}

          {:error, changeset} ->
            {:error, changeset}
        end
    end
  end

  @doc """
  Closes the seed round: for each active player, reads their latest
  successful preview run from round 1 and persists its `score` /
  `duration_ms` as the player's `seed_score` / `seed_duration_ms`. The
  seed round IS the bot fight — the score earned against bots during
  the round becomes the official seed score, no re-run needed.

  Duration was already computed by `Codebattle.GroupTask.Context` when
  the preview run was finalized (`tournament.started_at` →
  `solution.inserted_at`), so we just copy it onto the player row.

  Active players with no successful run for round 1 (never submitted,
  or only had failed/pending runs) are skipped — their `seed_score`
  stays nil and `assign_slices/1` won't place them.

  `opts`:
    * `:solutions_before` — `NaiveDateTime` / `DateTime` cutoff. Runs
      inserted after the cutoff are ignored, matching the round-finish
      fairness window used by slice rounds.

  Returns `[{user_id, :ok | :skipped}]` for every active player.
  """
  @spec run_seeding(GroupTournament.t(), keyword()) ::
          [{integer(), :ok | :skipped}] | [{:unknown, {:error, term()}}]
  def run_seeding(%GroupTournament{} = group_tournament, opts \\ []) do
    cutoff = solutions_before_opt(opts)
    player_ids = list_active_player_ids(group_tournament.id)
    latest_runs = list_latest_seed_runs(group_tournament.id, player_ids, cutoff)

    case Repo.transaction(fn -> apply_seed_results(group_tournament.id, player_ids, latest_runs) end) do
      {:ok, results} -> results
      {:error, reason} -> [{:unknown, {:error, reason}}]
    end
  end

  defp apply_seed_results(group_tournament_id, player_ids, latest_runs) do
    Enum.map(player_ids, &apply_seed_result(group_tournament_id, &1, Map.get(latest_runs, &1)))
  end

  defp apply_seed_result(_group_tournament_id, user_id, nil), do: {user_id, :skipped}

  defp apply_seed_result(group_tournament_id, user_id, %{score: score, duration_ms: duration_ms}) do
    persist_seed(group_tournament_id, user_id, score, duration_ms)
    {user_id, :ok}
  end

  defp list_latest_seed_runs(_group_tournament_id, [], _cutoff), do: %{}

  defp list_latest_seed_runs(group_tournament_id, player_ids, cutoff) do
    UserGroupTournamentRun
    |> join(:inner, [r], ugt in assoc(r, :user_group_tournament))
    |> where(
      [r, ugt],
      ugt.group_tournament_id == ^group_tournament_id and
        ugt.user_id in ^player_ids and
        r.round_position == 1 and
        r.status == "success" and
        not is_nil(r.score)
    )
    |> maybe_filter_runs_before(cutoff)
    |> order_by([r, ugt], asc: ugt.user_id, desc: r.inserted_at, desc: r.id)
    |> distinct([_r, ugt], ugt.user_id)
    |> select([r, ugt], {ugt.user_id, %{score: r.score, duration_ms: r.duration_ms}})
    |> Repo.all()
    |> Map.new()
  end

  defp maybe_filter_runs_before(query, nil), do: query

  defp maybe_filter_runs_before(query, %NaiveDateTime{} = cutoff), do: where(query, [r, _ugt], r.inserted_at <= ^cutoff)

  defp maybe_filter_runs_before(query, %DateTime{} = cutoff),
    do: where(query, [r, _ugt], r.inserted_at <= ^DateTime.to_naive(cutoff))

  @doc """
  Persists the seed-round (round 1) score row for each seeded player,
  capturing the slice they were assigned to during seeding.

  Must be called *after* `assign_slices/1` so `player.slice_index` reflects
  the seed assignment — before any later round's movement overwrites it.
  Without this, the leaderboard's "Seed" view falls back to the player's
  current slice and shows seed scores grouped by their *final* slice
  instead of the seed slice.

  Place is the player's *global* rank across all seeded players (sorted by
  seed_score desc, then faster seed duration), not the rank within their
  assigned slice. Slice rank is implicit in the slice ordering itself and
  would lose useful information ("you placed N out of M"); the global rank
  is what determines slice assignment, so it's the meaningful number to
  surface in the UI.
  """
  @spec record_seed_round_scores(GroupTournament.t()) :: {:ok, non_neg_integer()}
  def record_seed_round_scores(%GroupTournament{id: tournament_id}) do
    now = NaiveDateTime.utc_now(:second)

    seeded =
      GroupTournamentPlayer
      |> where(
        [p],
        p.group_tournament_id == ^tournament_id and not is_nil(p.seed_score) and
          not is_nil(p.slice_index)
      )
      |> select([p], %{
        user_id: p.user_id,
        slice_index: p.slice_index,
        seed_score: p.seed_score,
        seed_duration_ms: p.seed_duration_ms
      })
      |> Repo.all()

    rows =
      seeded
      |> Enum.sort_by(fn p -> {-p.seed_score, p.seed_duration_ms || 0} end)
      |> Enum.with_index(1)
      |> Enum.map(fn {p, global_place} ->
        %{
          group_tournament_id: tournament_id,
          user_id: p.user_id,
          run_id: nil,
          round_position: 1,
          slice_index: p.slice_index,
          place: global_place,
          score: p.seed_score,
          inserted_at: now,
          updated_at: now
        }
      end)

    case rows do
      [] ->
        {:ok, 0}

      _ ->
        {count, _} =
          Repo.insert_all(GroupTournamentRoundScore, rows,
            on_conflict: {:replace, [:run_id, :slice_index, :place, :score, :updated_at]},
            conflict_target: [:group_tournament_id, :user_id, :round_position]
          )

        {:ok, count}
    end
  end

  @doc """
  Applies the tournament's configured movement strategy to update each
  player's `slice_index` based on the round's results. Returns
  `{:ok, slice_count}` on success.

  `round_results` is the list of `%{user_id, slice_index, place}` produced
  by the slice runs of the round that just ended.

  After the strategy returns, slices are normalized so that slices
  `0..slice_count - 2` each contain exactly `slice_size` players and the
  bottom slice absorbs the remainder. Within each target slice we keep the
  players whose strategy intent was strongest (lower original slice and
  better place win ties), so the strategy's ordering is preserved — only
  size violations are corrected.
  """
  @spec apply_movement(GroupTournament.t(), [Movement.round_result()]) ::
          {:ok, non_neg_integer()} | {:error, term()}
  def apply_movement(%GroupTournament{} = group_tournament, round_results) do
    slice_count = group_tournament.slice_count || 0
    slice_size = group_tournament.slice_size

    movement_opts = %{slice_count: slice_count, slice_size: slice_size}

    assignments = Movement.reassign(group_tournament.movement_strategy, round_results, movement_opts)
    normalized = normalize_slice_sizes(assignments, round_results, slice_count, slice_size)

    Repo.transaction(fn ->
      normalized
      |> Enum.group_by(& &1.new_slice_index, & &1.user_id)
      |> Enum.each(fn {new_slice_index, user_ids} ->
        GroupTournamentPlayer
        |> where(
          [p],
          p.group_tournament_id == ^group_tournament.id and p.user_id in ^user_ids
        )
        |> Repo.update_all(set: [slice_index: new_slice_index, updated_at: NaiveDateTime.utc_now()])
      end)

      Map.new(normalized, &{&1.user_id, &1.new_slice_index})
    end)
  end

  # Reflow assignments so slices 0..slice_count-2 each hold exactly
  # `slice_size` players and the bottom slice gets the remainder. Players
  # are placed by strategy-assigned slice first, then by original slice
  # (lower = stronger), then by place ascending, then by user_id for a
  # deterministic tiebreak.
  defp normalize_slice_sizes(assignments, _round_results, slice_count, _slice_size)
       when slice_count <= 1 or assignments == [] do
    assignments
  end

  defp normalize_slice_sizes(assignments, round_results, slice_count, slice_size)
       when is_integer(slice_size) and slice_size > 0 do
    results_by_user = Map.new(round_results, fn r -> {r.user_id, r} end)

    last_index = slice_count - 1

    assignments
    |> Enum.sort_by(fn %{user_id: user_id, new_slice_index: new_idx} ->
      r = Map.get(results_by_user, user_id, %{slice_index: new_idx, place: slice_size + 1})
      {new_idx, Map.get(r, :slice_index, new_idx), Map.get(r, :place, slice_size + 1), user_id}
    end)
    |> Enum.with_index()
    |> Enum.map(fn {%{user_id: user_id}, position} ->
      slot = min(div(position, slice_size), last_index)
      %{user_id: user_id, new_slice_index: slot}
    end)
  end

  defp normalize_slice_sizes(assignments, _round_results, _slice_count, _slice_size), do: assignments

  # Re-rank from our persisted per-user runs rather than the runner's place,
  # so movement decisions match the score+submission-duration ordering that
  # `apply_tournament_scoring` records (see `Codebattle.GroupTask.Context`).
  # Ranking is (score desc, duration_ms asc); a missing duration sorts last
  # within an equal-score group.
  @missing_duration_sentinel 9_999_999_999_999
  defp build_round_results(run, ids, slice_index) do
    run.run_key
    |> GroupTaskContext.list_run_results_by_run_key(ids)
    |> Enum.sort_by(fn r -> {-r.score, r.duration_ms || @missing_duration_sentinel} end)
    |> Enum.with_index(1)
    |> Enum.map(fn {r, dense_place} ->
      %{user_id: r.user_id, place: dense_place, score: r.score, duration_ms: r.duration_ms, slice_index: slice_index}
    end)
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
  # We want highest score first → use -score. We then add the duration_ms as
  # a tie-break so faster submissions outrank slower ones at the same score.
  # The multiplier must exceed any plausible duration: durations are now
  # measured from tournament start to solution submission (hours of ms are
  # realistic), so 10^12 leaves comfortable headroom — a 1-point score gap
  # is worth ~31 years of submission delay.
  @seed_score_weight 1_000_000_000_000
  defp seed_ranking(nil, _duration), do: nil
  defp seed_ranking(score, nil), do: -score * @seed_score_weight
  defp seed_ranking(score, duration_ms), do: -score * @seed_score_weight + duration_ms

  # Pad short slices with bots so a slice always plays against a full field of
  # `slice_size` participants. The bottom slice is exempt — by design it holds
  # the remainder when player count doesn't divide evenly, so a partial field
  # there is expected and bot-fillers would just add noise. Fully-populated
  # slices run without bots — humans race only each other.
  defp include_bots_for_slice?(%GroupTournament{slice_size: slice_size} = t, ids, slice_index)
       when is_integer(slice_size) and slice_size > 0 do
    cond do
      length(ids) >= slice_size -> false
      bottom_slice?(t, slice_index) -> false
      true -> true
    end
  end

  defp include_bots_for_slice?(_, _, _), do: false

  defp bottom_slice?(%GroupTournament{slice_count: slice_count}, slice_index)
       when is_integer(slice_count) and slice_count > 0 and is_integer(slice_index) do
    slice_index == slice_count - 1
  end

  defp bottom_slice?(_, _), do: false

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

  defp list_player_ids_with_solution(_group_tournament, [], _cutoff), do: []

  defp list_player_ids_with_solution(%GroupTournament{} = group_tournament, player_ids, cutoff) do
    GroupTaskSolution
    |> where(
      [s],
      s.group_task_id == ^group_tournament.group_task_id and
        s.group_tournament_id == ^group_tournament.id and
        s.user_id in ^player_ids
    )
    |> maybe_filter_solutions_before(cutoff)
    |> distinct([s], s.user_id)
    |> select([s], s.user_id)
    |> Repo.all()
  end

  defp maybe_filter_solutions_before(query, nil), do: query

  defp maybe_filter_solutions_before(query, %NaiveDateTime{} = cutoff) do
    where(query, [s], s.inserted_at <= ^cutoff)
  end

  defp maybe_filter_solutions_before(query, %DateTime{} = cutoff) do
    where(query, [s], s.inserted_at <= ^DateTime.to_naive(cutoff))
  end
end
