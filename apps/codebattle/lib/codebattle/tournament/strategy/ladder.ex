defmodule Codebattle.Tournament.Ladder do
  @moduledoc """
  Continuous, pool-based matchmaking tournament (a "ladder").

  Unlike Swiss (synchronized rounds where everyone waits for the slowest player),
  players sit in a waiting pool and are paired on a fixed interval (a "tick"). Each
  game runs on the task's own clock (`time_to_solve_sec`, via `timeout_mode: "per_task"`),
  so a slow game just spans several ticks while the fast finishers get re-matched on the
  next tick instead of waiting.

  Config:
    * `rounds_limit`         — total number of matching ticks (each player plays ≤ N games)
    * `round_timeout_seconds` — the tick interval in seconds

  Matching is score-sorted with no human rematches (`played_pair_ids`); any player left
  unmatched on a tick (odd count, already faced everyone available, or churn) is paired
  with the tournament bot. Ranking is recomputed on every tick from all finished games.
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
  # by the tick timer (and the empty-pool early tick in `maybe_create_rematch`). Returning
  # false keeps the server out of the round-finish/break machinery entirely.
  @impl Tournament.Base
  def finish_round_after_match?(_tournament), do: false

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

  # No rematch game. Broadcast the wait overlay, then — if this finish emptied the playing
  # pool — run an early tick so idle players are re-matched (or the tournament finishes)
  # without waiting for the next scheduled tick. Runs in the server process, so creating
  # games synchronously here is safe (same pattern as Swiss finishing a round on its last
  # match). Scoring is NOT done here; the tick recomputes ranking.
  @impl Tournament.Base
  def maybe_create_rematch(tournament, game_params) do
    Codebattle.PubSub.broadcast("tournament:game:wait", %{
      game_id: game_params.game_id,
      type: wait_type(tournament)
    })

    if get_matches(tournament, "playing") == [] do
      matchmaking_tick(tournament)
    else
      tournament
    end
  end

  # Fired by the server every `round_timeout_seconds` (and on the empty-pool early tick).
  # Recompute the live ranking, then either finish or match the idle pool.
  @impl Tournament.Base
  def matchmaking_tick(tournament) do
    tournament = recompute_ranking(tournament)

    cond do
      finish_tournament?(tournament) -> maybe_finish_tournament(tournament)
      ticks_remaining?(tournament) -> match_idle_pool(tournament)
      true -> tournament
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
    |> tap(&broadcast_tournament_update/1)
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

  # Pair score-sorted players avoiding human rematches; bot-fill anyone left over. Only
  # human–human pairs are recorded in played_pair_ids (bot rematches are allowed).
  defp pair_and_bot_fill(tournament, players) do
    played = MapSet.new(tournament.played_pair_ids)
    {human_pairs, unmatched, played} = pair_no_rematch(players, [], [], played)

    {tournament, pairs} =
      case unmatched do
        [] ->
          {tournament, human_pairs}

        leftovers ->
          {tournament, bot} = get_or_build_tournament_bot(tournament)
          {tournament, human_pairs ++ Enum.map(leftovers, &[&1, bot])}
      end

    {update_struct(tournament, %{played_pair_ids: played}), pairs}
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

  # The first (highest-score) candidate this player has not already faced, if any.
  defp take_fresh_opponent(player, candidates, played) do
    case Enum.split_while(candidates, &MapSet.member?(played, Enum.sort([player.id, &1.id]))) do
      {_faced, []} -> :none
      {faced, [fresh | rest]} -> {fresh, faced ++ rest}
    end
  end

  defp ticks_remaining?(tournament) do
    tournament.current_round_position < tournament.rounds_limit - 1
  end

  defp wait_type(tournament) do
    if ticks_remaining?(tournament), do: "round", else: "tournament"
  end
end
