defmodule Codebattle.Tournament.PairBuilder.ByScore do
  @opaque player_id :: pos_integer()
  @opaque score :: pos_integer()
  @opaque player :: {player_id(), score()}
  @opaque pair :: list(player_id())

  @spec call(nonempty_list(player)) ::
          {pairs :: list(pair()), unmatched_player_ids :: list(player_id())}
  def call(players) do
    players
    |> Enum.sort_by(&elem(&1, 1), :desc)
    |> Enum.map(&elem(&1, 0))
    |> match_players([])
  end

  defp match_players([], pairs) do
    {pairs, []}
  end

  defp match_players([player_id], pairs) do
    {pairs, [player_id]}
  end

  defp match_players([p1_id, p2_id | rest_ids], pairs) do
    match_players(rest_ids, [[p1_id, p2_id] | pairs])
  end
end
