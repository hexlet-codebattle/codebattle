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

  Matching is score-sorted and prefers fresh (non-rematch) opponents (`played_pair_ids`),
  but falls back to a human rematch rather than a bot when a player's only available
  opponents are ones they've already faced. A bot is used only for a genuinely-odd final
  player. Ranking is recomputed on every tick from all finished games.
  """
  use Codebattle.Tournament.Base

  alias Codebattle.Tournament

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
      score =
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

      put_match_score(player_id, result, score)
    end)
  end

  @impl Tournament.Base
  def round_timeout_seconds(%{timeout_mode: "per_task"} = tournament) do
    case get_task(tournament, nil) do
      %{base_score: base_score} when is_integer(base_score) and base_score > 0 ->
        base_score

      _ ->
        tournament.round_timeout_seconds
    end
  end

  def round_timeout_seconds(tournament), do: fixed_tick_timeout(tournament.round_timeout_seconds)

  # The last wave has no next matchmaking tick. Its safety deadline follows the real game
  # timeout: the current task in per_task mode, or the configured round timeout otherwise.
  # Tasks are already preloaded in ETS, so this never performs a database query.
  def final_deadline_seconds(%{timeout_mode: "per_task"} = tournament) do
    case get_task(tournament, nil) do
      %{time_to_solve_sec: seconds} when is_integer(seconds) and seconds > 0 ->
        seconds

      _ ->
        positive_timeout(tournament.round_timeout_seconds)
    end
  end

  def final_deadline_seconds(tournament), do: positive_timeout(tournament.round_timeout_seconds)

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
  # have drained. The playing-matches guard also protects the framework's finish path from
  # force-killing in-flight games.
  @impl Tournament.Base
  def finish_tournament?(tournament) do
    not ticks_remaining?(tournament) and get_matches(tournament, "playing") == []
  end

  # Initial matching (round 0), run from the generic start flow. Everyone is idle at start,
  # so this pairs the whole active roster (bot-filling the odd one out).
  @impl Tournament.Base
  def build_round_pairs(tournament) do
    pair_and_bot_fill(tournament, idle_pool(tournament))
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
  # post-break tick). Recompute the live ranking, then either finish or match the idle pool.
  # A periodic tick that fires mid-break is a no-op beyond ranking: the break-over message
  # is the authoritative trigger for the next round, so it must not create games early.
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
        ticks_remaining?(tournament) -> match_idle_pool(tournament)
        true -> tournament
      end
    end
  end

  defp match_idle_pool(tournament) do
    case idle_pool(tournament) do
      [] -> tournament
      idle -> run_tick(tournament, idle)
    end
  end

  # A productive tick: open a new round (bucket), pair the idle pool (+ bot-fill), start games.
  defp run_tick(tournament, idle) do
    tournament = increment_current_round(tournament)
    tournament = build_and_save_round!(tournament)
    tournament = update_struct(tournament, %{current_round_timeout_seconds: round_timeout_seconds(tournament)})
    {tournament, pairs} = pair_and_bot_fill(tournament, idle)

    {tournament, pairs}
    |> bulk_insert_round_games(%{})
    |> db_save!()
    |> broadcast_round_created()
  end

  # Ranking & places are recomputed from all finished games by reusing the exact function
  # the final standings use, so the live leaderboard and the final result are one code path.
  defp recompute_ranking(tournament) do
    tournament
    |> compute_final_standings()
    |> tap(fn tournament ->
      broadcast_tournament_update(tournament)

      Codebattle.PubSub.broadcast("tournament:results_updated", %{
        tournament_id: tournament.id
      })
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
    |> Enum.sort_by(& &1.score, :desc)
  end

  # Pair score-sorted players, preferring fresh (non-rematch) opponents. Anyone the
  # no-rematch pass can't place is then paired with another leftover — a human rematch is
  # preferred over a bot — so a bot is used only for a genuinely-odd final player. All
  # human–human pairs (fresh and rematch) are recorded in played_pair_ids.
  defp pair_and_bot_fill(tournament, players) do
    played = MapSet.new(tournament.played_pair_ids)
    {fresh_pairs, unmatched, played} = pair_no_rematch(players, [], [], played)
    {rematch_pairs, leftovers, played} = pair_leftovers(unmatched, [], played)
    human_pairs = fresh_pairs ++ rematch_pairs

    {tournament, pairs} =
      case leftovers do
        [] ->
          {tournament, human_pairs}

        leftovers ->
          {tournament, bot} = get_or_build_tournament_bot(tournament)
          {tournament, human_pairs ++ Enum.map(leftovers, &[&1, bot])}
      end

    {update_struct(tournament, %{played_pair_ids: played}), pairs}
  end

  # Fallback for players the no-rematch pass left unmatched (their only available opponents
  # were ones they'd already faced): pair them off with each other rather than a bot. Only a
  # genuinely-odd final player remains, to be bot-filled by the caller.
  defp pair_leftovers([a, b | rest], pairs, played) do
    key = Enum.sort([a.id, b.id])
    pair_leftovers(rest, [[a, b] | pairs], MapSet.put(played, key))
  end

  defp pair_leftovers(leftovers, pairs, played) do
    {Enum.reverse(pairs), leftovers, played}
  end

  defp pair_no_rematch([], pairs, leftovers, played) do
    {Enum.reverse(pairs), Enum.reverse(leftovers), played}
  end

  defp pair_no_rematch([player | rest], pairs, leftovers, played) do
    case take_fresh_opponent(player, rest, played) do
      {opponent, remaining} ->
        key = Enum.sort([player.id, opponent.id])
        pair_no_rematch(remaining, [[player, opponent] | pairs], leftovers, MapSet.put(played, key))

      :none ->
        pair_no_rematch(rest, pairs, [player | leftovers], played)
    end
  end

  # Prefer the fresh candidate with the fewest alternatives of their own. Taking a
  # constrained opponent first avoids a common greedy-matching failure where the
  # highest-score candidate is picked immediately and another player is needlessly
  # forced into a rematch even though an all-fresh pairing exists.
  defp take_fresh_opponent(player, candidates, played) do
    fresh_candidates =
      Enum.reject(candidates, &played_pair?(played, player, &1))

    case fresh_candidates do
      [] ->
        :none

      _ ->
        opponent =
          Enum.min_by(fresh_candidates, fn candidate ->
            candidates
            |> List.delete(candidate)
            |> Enum.count(&(not played_pair?(played, candidate, &1)))
          end)

        {opponent, List.delete(candidates, opponent)}
    end
  end

  defp played_pair?(played, player, opponent) do
    MapSet.member?(played, Enum.sort([player.id, opponent.id]))
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

  defp put_match_score(player_id, result, _score) when is_integer(player_id) and player_id < 0 do
    {player_id, result}
  end

  defp put_match_score(player_id, result, score) do
    {player_id, Map.put(result, :score, score)}
  end

  defp calculate_match_score(player_id, result, state, base_score, solve_time, duration, player_ids, cheater_ids) do
    result_percent = Map.get(result, :result_percent, 0) || 0

    cond do
      MapSet.member?(cheater_ids, player_id) ->
        0

      full_score_for_cheating_opponent?(player_id, player_ids, cheater_ids, state, result_percent) ->
        base_score

      true ->
        factor = score_factor(state, result, solve_time, duration)
        round(base_score * factor * result_percent / 100)
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
