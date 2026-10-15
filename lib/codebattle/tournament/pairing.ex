defmodule Codebattle.Tournament.Pairing do
  @moduledoc """
  Shared pairing helpers for Swiss and Ladder.

  Pair history (`played_pair_ids`) is a MapSet of `{min_id, max_id}` keys. A game against
  the tournament bot is recorded too, which is how a player's previous bye is known.
  """

  def key(a, b), do: {min(a, b), max(a, b)}

  def played?(played, player, opponent), do: MapSet.member?(played, key(player.id, opponent.id))

  def record(played, player, opponent), do: MapSet.put(played, key(player.id, opponent.id))

  def record_byes(played, bye_players, bot), do: Enum.reduce(bye_players, played, &record(&2, &1, bot))

  # Standings order. Before the first round there are no scores, so players go by id;
  # afterwards by score, then time spent, then id, so equal standings pair the same way
  # on every run.
  def sort(players, %{current_round_position: 0}), do: Enum.sort_by(players, & &1.id)

  def sort(players, _tournament) do
    Enum.sort_by(players, &{-(&1.score || 0), &1.total_duration_sec || 0, &1.id})
  end

  # With an odd field one player sits out against the bot. It goes to the lowest-standing
  # player who hasn't played the bot yet, so nobody collects a second bye while others
  # have had none. Players must already be in standings order.
  def pick_bye(players, bot, played) do
    if rem(length(players), 2) == 0 do
      {[], players}
    else
      bye_player =
        players
        |> Enum.reverse()
        |> Enum.find(List.last(players), &(not played?(played, &1, bot)))

      {[bye_player], List.delete(players, bye_player)}
    end
  end
end
