defmodule Codebattle.Tournament.PairBuilder.ByClanAndScore do
  @opaque player_id :: pos_integer()
  @opaque clan_id :: pos_integer()
  @opaque score :: pos_integer()
  @opaque player :: {player_id(), clan_id(), score()}
  @opaque pair :: list(player_id())

  @spec call(nonempty_list(player)) ::
          {pairs :: list(pair()), unmatched_player_ids :: list(player_id())}
  def call(players) do
    players |> Enum.sort_by(&elem(&1, 2), :desc) |> match_players([], [])
  end

  defp match_players([], pairs, unmatched_player_ids) do
    {pairs, unmatched_player_ids}
  end

  defp match_players([player], pairs, unmatched_player_ids) do
    {pairs, [elem(player, 0) | unmatched_player_ids]}
  end

  defp match_players([{p1_id, c1_id, _s1}, {p2_id, c2_id, _s2}], pairs, unmatched_player_ids)
       when c1_id != c2_id do
    {[[p1_id, p2_id] | pairs], unmatched_player_ids}
  end

  defp match_players([{p1_id, c1_id, _s1}, {p2_id, c2_id, _s2}], pairs, unmatched_player_ids)
       when c1_id == c2_id do
    {pairs, [p1_id, p2_id | unmatched_player_ids]}
  end

  defp match_players([{p1_id, c1_id, _s1} | remain_players], pairs, unmatched_player_ids) do
    Enum.reduce_while(
      remain_players,
      nil,
      fn {p2_id, c2_id, _s}, _acc ->
        if c1_id == c2_id do
          {:cont, :no_match}
        else
          {:halt, {:match, [p1_id, p2_id], drop_player(remain_players, p2_id)}}
        end
      end
    )
    |> case do
      # if it found a new player from another clan
      # then build a new pair
      {:match, new_pair, remain_players} ->
        match_players(remain_players, [new_pair | pairs], unmatched_player_ids)

      # if it didn't find a new player from another clan
      # then put into unmatched_player_ids
      :no_match ->
        match_players(remain_players, pairs, [p1_id | unmatched_player_ids])
    end
  end

  defp drop_player(players, player_id) do
    index_to_delete = Enum.find_index(players, &(elem(&1, 0) == player_id))
    List.delete_at(players, index_to_delete)
  end
end
