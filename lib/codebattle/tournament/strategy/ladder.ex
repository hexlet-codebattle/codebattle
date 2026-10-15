defmodule Codebattle.Tournament.Ladder do
  @moduledoc """
  Continuous, pool-based matchmaking tournament (a "ladder").

  Unlike Swiss (synchronized rounds where everyone waits for the slowest player),
  players sit in a waiting pool and are paired on a fixed interval (a "tick"). Each
  game runs on the task's own clock (`time_to_solve_sec`, via `timeout_mode: "per_task"`),
  while the next matchmaking tick is derived from the timeout mode. In `per_task`, the
  tick uses the task's `base_score`; in fixed-time modes, games use `round_timeout_seconds`
  and the tick fires at 3/4 of that value.

  Config:
    * `rounds_limit`         — total number of matching ticks (each player plays ≤ N games)
    * `round_timeout_seconds` — fixed game timeout for non-`per_task` modes, and fallback tick interval

  Matching is standings-sorted and prefers fresh (non-rematch) opponents (`played_pair_ids`)
  among nearby players; a human rematch is preferred over a bot. With an odd pool the bot
  plays the lowest-standing player who hasn't had it yet.
  Ranking is recomputed on every tick from all finished games: results are rebuilt for
  every round that is not settled yet, then all totals come from one aggregate query.
  """
  use Codebattle.Tournament.Base

  alias Codebattle.Tournament
  alias Codebattle.Tournament.Pairing
  alias Codebattle.Tournament.TaskProvider

  @min_opponent_window 20
  # Let the game's own timeout finish first; the final-wave deadline is the safety net for
  # a stuck final wave, not a competing timeout clock.
  @final_deadline_grace_seconds 2
  # A tick processed within this long after its planned moment counts as on schedule.
  @scheduled_tick_tolerance_ms 5_000

  @impl Tournament.Base
  def game_type, do: "duo"

  @impl Tournament.Base
  def complete_players(tournament), do: tournament

  @impl Tournament.Base
  def reset_meta(meta), do: meta

  @impl Tournament.Base
  def calculate_round_results(tournament), do: tournament

  # Ladder never auto-finishes a round on a match completion: matching is driven purely
  # by the tick timer (and the server's empty-pool drain in `maybe_drain_ladder_wave`, which
  # may insert a break first). Returning false keeps the server out of the generic
  # round-finish machinery entirely.
  @impl Tournament.Base
  def finish_round_after_match?(_tournament), do: false

  def maybe_finish_round_after_finish_match(tournament), do: tournament

  def prepare_match_player_results(tournament, match, params) do
    # Ladder tasks are preloaded in ETS before games start, so immediate scoring stays
    # entirely in memory and never falls back to a database lookup.
    task = get_task(tournament, match.task_id)
    base_score = task_base_score(task)
    solve_time = task_solve_time(task, tournament)
    duration = Map.get(params, :duration_sec, 0) || 0
    cheater_ids = tournament |> Map.get(:cheater_ids) |> List.wrap() |> MapSet.new()

    Map.new(params.player_results, fn {player_id, result} ->
      {score, score_factor} =
        calculate_match_score(
          player_id,
          result,
          params.game_state,
          base_score,
          solve_time,
          duration,
          match.player_ids,
          cheater_ids
        )

      put_match_score(player_id, result, score, base_score, score_factor)
    end)
  end

  @impl Tournament.Base
  def round_timeout_seconds(tournament), do: tick_seconds(tournament, get_task(tournament, nil))

  # The last wave has no next matchmaking tick. Its safety deadline follows the real game
  # timeout: the current task in per_task mode, or the configured round timeout otherwise.
  # Tasks are already preloaded in ETS, so this never performs a database query.
  def final_deadline_seconds(tournament), do: game_seconds(tournament, get_task(tournament, nil))

  # Seconds until the server's next ladder timer fires for the current round: the next
  # matchmaking tick while ticks remain, else the final-wave safety deadline. The server
  # arms its timer with this value and `stamp_round_clock/1` publishes the same moment to
  # clients as `next_round_at`, so the UI countdown and the real timer agree.
  def next_timer_seconds(tournament) do
    round_seconds(tournament, tournament.current_round_position, get_task(tournament, nil))
  end

  def next_round_at(tournament, seconds \\ nil) do
    DateTime.add(DateTime.utc_now(:millisecond), seconds || next_timer_seconds(tournament), :second)
  end

  # The planned schedule: how long each round lasts, by position — until the next tick, and
  # for the last round until its final deadline. Every tick opens a round (even an empty
  # one), so the whole tournament is known in advance: an early drain only moves rounds
  # earlier, never later. `tasks` are the round tasks in order (nil where unknown).
  def round_durations(tournament, tasks) do
    for position <- 0..(tournament.rounds_limit - 1)//1 do
      round_seconds(tournament, position, Enum.at(tasks, position))
    end
  end

  # The schedule once the tournament has started: round tasks are fixed and in ETS.
  def round_durations(tournament) do
    tasks =
      for position <- 0..(tournament.rounds_limit - 1)//1 do
        tournament |> Map.put(:current_round_position, position) |> get_task(nil)
      end

    round_durations(tournament, tasks)
  end

  # The schedule before the start, when it can be known: fixed-timeout modes don't depend on
  # tasks, and a sequential task pack fixes the task order. Random tasks are only picked at
  # the start, so their schedule is published then. Reads the database; call it rarely.
  def planned_round_durations(%{timeout_mode: "per_task"} = tournament) do
    case tournament do
      %{task_provider: "task_pack", task_strategy: "sequential", task_pack_name: name} when is_binary(name) ->
        task_ids = TaskProvider.get_task_ids(tournament)
        tasks_by_id = task_ids |> Codebattle.Task.get_by_ids() |> Map.new(&{&1.id, &1})
        round_durations(tournament, Enum.map(task_ids, &Map.get(tasks_by_id, &1)))

      _ ->
        nil
    end
  end

  def planned_round_durations(tournament), do: round_durations(tournament, [])

  defp round_seconds(tournament, position, task) do
    if position < tournament.rounds_limit - 1 do
      max(tick_seconds(tournament, task) || 60, 1)
    else
      game_seconds(tournament, task) + @final_deadline_grace_seconds
    end
  end

  defp tick_seconds(%{timeout_mode: "per_task"} = tournament, task) do
    case task do
      %{base_score: base_score} when is_integer(base_score) and base_score > 0 -> base_score
      _ -> tournament.round_timeout_seconds
    end
  end

  defp tick_seconds(tournament, _task), do: fixed_tick_timeout(tournament.round_timeout_seconds)

  defp game_seconds(%{timeout_mode: "per_task"} = tournament, task) do
    case task do
      %{time_to_solve_sec: seconds} when is_integer(seconds) and seconds > 0 -> seconds
      _ -> positive_timeout(tournament.round_timeout_seconds)
    end
  end

  defp game_seconds(tournament, _task), do: positive_timeout(tournament.round_timeout_seconds)

  defp fixed_tick_timeout(seconds) when is_integer(seconds) and seconds > 0 do
    seconds
    |> Kernel.*(3)
    |> div(4)
    |> max(1)
  end

  defp fixed_tick_timeout(_seconds), do: nil

  defp positive_timeout(seconds) when is_integer(seconds) and seconds > 0, do: seconds
  defp positive_timeout(_seconds), do: 60

  # The tournament is over once all `rounds_limit` ticks are dispatched and their games
  # have drained, or once nobody is left to pair (every player left or was banned) — no
  # point running empty rounds to the end of the schedule. The playing-matches guard also
  # protects the framework's finish path from force-killing in-flight games.
  @impl Tournament.Base
  def finish_tournament?(tournament) do
    not playing_matches?(tournament) and
      (not ticks_remaining?(tournament) or not active_players?(tournament))
  end

  defp active_players?(tournament) do
    tournament
    |> get_players("active")
    |> Enum.any?(&(&1.is_bot != true))
  end

  # Initial matching (round 0), run from the generic start flow. Everyone is idle at start,
  # so this pairs the whole active roster (bot-filling the odd one out).
  @impl Tournament.Base
  def build_round_pairs(tournament) do
    tournament
    |> update_struct(%{round_durations: round_durations(tournament)})
    |> stamp_round_clock()
    |> pair_and_bot_fill(idle_pool(tournament))
  end

  # No rematch game. Broadcast the wait overlay so the players' game UIs unblock. Whether
  # to run an early tick (or insert a break first) once the playing pool drains is decided
  # by the server, which owns the tick timer — see `maybe_drain_ladder_wave/1`.
  @impl Tournament.Base
  def maybe_create_rematch(tournament, game_params) do
    Codebattle.PubSub.broadcast("tournament:game:wait", %{
      game_id: game_params.game_id,
      type: wait_type(tournament)
    })

    tournament
  end

  # Fired by the server every `round_timeout_seconds` (and on the empty-pool early tick /
  # post-break tick). Recompute the live ranking, then either finish or open the next round.
  # Every tick opens a round, even when nobody is free to play it (an empty round), so the
  # tournament follows its planned schedule. A periodic tick that fires mid-break is a no-op
  # beyond ranking: the break-over message is the authoritative trigger for the next round.
  @impl Tournament.Base
  def matchmaking_tick(tournament) do
    if finish_tournament?(tournament) do
      # finish_tournament/1 computes and persists final standings. Avoid rebuilding the
      # complete leaderboard once here and a second time in the finalization pipeline.
      maybe_finish_tournament(tournament)
    else
      tournament = recompute_ranking(tournament)

      cond do
        in_break?(tournament) -> tournament
        ticks_remaining?(tournament) -> run_tick(tournament, idle_pool(tournament))
        true -> tournament
      end
    end
  end

  # Open a new round (bucket), pair the idle pool (+ bot-fill) and start its games. With
  # nobody idle the round is empty: players still in a game skip it.
  defp run_tick(tournament, idle) do
    tournament = increment_current_round(tournament)
    tournament = build_and_save_round!(tournament)
    tournament = update_struct(tournament, %{current_round_timeout_seconds: round_timeout_seconds(tournament)})
    {tournament, pairs} = tournament |> stamp_round_clock() |> pair_and_bot_fill(idle)

    {tournament, pairs}
    |> bulk_insert_round_games(%{})
    |> db_save!()
    |> broadcast_round_created()
  end

  # Every opened round records when it started and when the next one is due, so the
  # round_created broadcast already carries the countdown players see before the server
  # re-arms its timer with the same `next_timer_seconds/1`. A round opened by its scheduled
  # tick starts at the planned moment, not when the tick got processed, so the schedule
  # never drifts; an early start (drain, break end, admin) starts now.
  defp stamp_round_clock(tournament) do
    now = DateTime.utc_now(:millisecond)
    started_at = scheduled_start(Map.get(tournament, :next_round_at), now)

    update_struct(tournament, %{
      last_round_started_at: started_at |> DateTime.to_naive() |> NaiveDateTime.truncate(:second),
      next_round_at: DateTime.add(started_at, next_timer_seconds(tournament), :second)
    })
  end

  defp scheduled_start(%DateTime{} = planned, now) do
    late_ms = DateTime.diff(now, planned, :millisecond)
    if late_ms >= 0 and late_ms < @scheduled_tick_tolerance_ms, do: planned, else: now
  end

  defp scheduled_start(_planned, now), do: now

  # Ranking & places are recomputed from all finished games. Round results come from the
  # same SQL the final standings replay, but only for rounds that are not settled yet: a
  # round is settled once none of its games is playing, and its results never change after
  # that (a ban resets the settled mark, the final standings replay everything). Totals over
  # all rounds then come from one aggregate query and one sort.
  defp recompute_ranking(tournament) do
    tournament
    |> sync_unsettled_round_results()
    |> then(&Tournament.Ranking.set_ranking_from_totals(&1, Tournament.TournamentResult.get_user_totals(&1)))
    |> tap(fn tournament ->
      broadcast_tournament_update(tournament)

      Codebattle.PubSub.broadcast("tournament:results_updated", %{
        tournament_id: tournament.id
      })
    end)
  end

  defp sync_unsettled_round_results(tournament) do
    current = tournament.current_round_position
    first = Map.get(tournament, :results_synced_round_position, -1) + 1

    if first > current do
      tournament
    else
      settled_upto = last_settled_round(tournament, first, current)

      Enum.each(first..current//1, fn round_position ->
        tournament
        |> update_struct(%{current_round_position: round_position})
        |> Tournament.TournamentResult.upsert_results()
      end)

      update_struct(tournament, %{results_synced_round_position: settled_upto})
    end
  end

  # Checked before the results are rebuilt: a game that finishes later in the tick leaves
  # its round unsettled, so it is rebuilt again on the next tick.
  defp last_settled_round(tournament, first, current) do
    Enum.reduce_while(first..current//1, first - 1, fn round_position, settled ->
      if Tournament.Matches.playing?(tournament, round_position),
        do: {:halt, settled},
        else: {:cont, round_position}
    end)
  end

  # Idle = active, non-bot, non-banned players not currently in a playing match. Read fresh
  # from ETS each tick so joins/leaves/bans between ticks are handled automatically.
  defp idle_pool(tournament) do
    busy =
      tournament
      |> get_matches("playing")
      |> Enum.flat_map(& &1.player_ids)
      |> MapSet.new()

    tournament
    |> get_players("active")
    |> Enum.reject(&(&1.is_bot == true or MapSet.member?(busy, &1.id)))
    |> Pairing.sort(tournament)
  end

  # Pair the standings-sorted pool, preferring fresh opponents among nearby players. With
  # an odd pool the bot takes the lowest-standing player who hasn't had it yet.
  defp pair_and_bot_fill(tournament, players) do
    played = tournament.played_pair_ids

    {tournament, bye_pairs, players, played} =
      if rem(length(players), 2) == 0 do
        {tournament, [], players, played}
      else
        {tournament, bot} = get_or_build_tournament_bot(tournament)
        {bye_players, players} = Pairing.pick_bye(players, bot, played)
        {tournament, Enum.map(bye_players, &[&1, bot]), players, Pairing.record_byes(played, bye_players, bot)}
      end

    {pairs, played} = pair_players(players, [], played, opponent_window(tournament))

    {update_struct(tournament, %{played_pair_ids: played}), pairs ++ bye_pairs}
  end

  # A player has faced at most rounds_limit - 1 opponents, so a window one wider than that
  # always holds a fresh opponent whenever one is left at all.
  defp opponent_window(tournament), do: max(@min_opponent_window, (tournament.rounds_limit || 0) + 1)

  defp pair_players([], pairs, played, _window), do: {Enum.reverse(pairs), played}

  defp pair_players([player | rest], pairs, played, window) do
    {opponent, remaining} =
      case take_fresh_opponent(player, rest, played, window) do
        :none -> {hd(rest), tl(rest)}
        fresh -> fresh
      end

    pair_players(remaining, [[player, opponent] | pairs], Pairing.record(played, player, opponent), window)
  end

  # Among fresh opponents in the window, take the one with the fewest fresh options of its
  # own: picking a constrained opponent first avoids forcing someone else into a rematch.
  # Only the window prefix is traversed or copied; the rest of the pool is shared.
  defp take_fresh_opponent(player, candidates, played, window_size) do
    window = Enum.take(candidates, window_size)

    fresh_candidates =
      window
      |> Enum.with_index()
      |> Enum.reject(fn {candidate, _index} -> Pairing.played?(played, player, candidate) end)

    case fresh_candidates do
      [] ->
        :none

      _ ->
        {opponent, index} =
          Enum.min_by(fresh_candidates, fn {candidate, _index} ->
            Enum.count(window, &(&1.id != candidate.id and not Pairing.played?(played, candidate, &1)))
          end)

        {before, [_opponent | after_opponent]} = Enum.split(candidates, index)
        {opponent, before ++ after_opponent}
    end
  end

  # Public: the server consults this on wave-drain to decide break-vs-finish.
  def ticks_remaining?(tournament) do
    tournament.current_round_position < tournament.rounds_limit - 1
  end

  defp wait_type(tournament) do
    if ticks_remaining?(tournament), do: "round", else: "tournament"
  end

  defp task_base_score(%{base_score: base_score}), do: base_score || 0
  defp task_base_score(_task), do: 0

  defp task_solve_time(%{time_to_solve_sec: seconds}, _tournament) when is_integer(seconds) do
    max(seconds, 1)
  end

  defp task_solve_time(_task, tournament) do
    max(tournament.round_timeout_seconds || 1, 1)
  end

  defp put_match_score(player_id, result, _score, _base_score, _score_factor)
       when is_integer(player_id) and player_id < 0 do
    {player_id, result}
  end

  defp put_match_score(player_id, result, score, base_score, score_factor) do
    result =
      Map.merge(result, %{
        base_score: base_score,
        score: score,
        score_factor: score_factor
      })

    {player_id, result}
  end

  defp calculate_match_score(player_id, result, state, base_score, solve_time, duration, player_ids, cheater_ids) do
    result_percent = Map.get(result, :result_percent, 0) || 0

    cond do
      MapSet.member?(cheater_ids, player_id) ->
        {0, 0.0}

      full_score_for_cheating_opponent?(player_id, player_ids, cheater_ids, state, result_percent) ->
        {base_score, 1.0}

      true ->
        factor = score_factor(state, result, solve_time, duration)
        {round(base_score * factor * result_percent / 100), factor}
    end
  end

  defp full_score_for_cheating_opponent?(player_id, player_ids, cheater_ids, "game_over", result_percent)
       when result_percent < 100 do
    Enum.any?(player_ids, &opponent_cheater?(&1, player_id, cheater_ids))
  end

  defp full_score_for_cheating_opponent?(_player_id, _player_ids, _cheater_ids, _state, _result_percent), do: false

  defp opponent_cheater?(opponent_id, player_id, cheater_ids) do
    opponent_id != player_id and MapSet.member?(cheater_ids, opponent_id)
  end

  defp score_factor("timeout", _result, _solve_time, _duration), do: 0.5

  defp score_factor(_state, %{result: "won"}, solve_time, duration) do
    min(2.0, max(1.0, 2.0 - duration / solve_time))
  end

  defp score_factor(_state, _result, _solve_time, _duration), do: 0.75
end
