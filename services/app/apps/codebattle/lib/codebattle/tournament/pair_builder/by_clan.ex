# defmodule Codebattle.Tournament.PairBuilder.ByClan do
#   @type player_pair :: [pos_integer(), pos_integer()]
#   @type played_pair_ids :: MapSet.t(player_pair())

#   alias Codebattle.Tournament.Player

#   @spec call(nonempty_list(Player.t()), played_pair_ids()) :: {[], played_pair_ids()}
#   def call(players, played_pair_ids \\ []) do
#     sorted_players = Enum.sort_by(players, & &1.score, :desc)
#     {player_pairs, played_pair_ids} = build_new_pairs(sorted_players, [], played_pair_ids)
#     {Enum.reverse(player_pairs), played_pair_ids}
#   end

#   defp build_new_pairs([p1, p2], player_pairs, played_pair_ids) do
#     pair_ids = Enum.sort([p1.id, p2.id])

#     {[[p1, p2] | player_pairs], MapSet.put(played_pair_ids, pair_ids)}
#   end

#   defp build_new_pairs([player | remain_players], player_pairs, played_pair_ids) do
#     {player_pair, pair_ids, remain_players} =
#       Enum.reduce_while(
#         remain_players,
#         {player, remain_players, played_pair_ids},
#         fn candidate, _acc ->
#           pair_ids = Enum.sort([player.id, candidate.id])

#           if MapSet.member?(played_pair_ids, pair_ids) do
#             {:cont, {player, remain_players, played_pair_ids}}
#           else
#             {:halt,
#              {:new, [player, candidate], pair_ids, drop_player(remain_players, candidate.id)}}
#           end
#         end
#       )
#       |> case do
#         # if it found a new player with whom player hasn't played yet
#         # then build new pair
#         {:new, player_pair, pair_ids, remain_players} ->
#           {player_pair, pair_ids, remain_players}

#         # if it didn't find a new player with whom player have not played yet
#         # then pick next score opponent
#         {player, [opponent | rest_players], _played_pair_ids} ->
#           {
#             [player, opponent],
#             [player.id, opponent.id] |> Enum.map(& &1.id) |> Enum.sort(),
#             rest_players
#           }
#       end

#     build_new_pairs(
#       remain_players,
#       [player_pair | player_pairs],
#       MapSet.put(played_pair_ids, pair_ids)
#     )
#   end

#   defp drop_player(players, player_id) do
#     index_to_delete = Enum.find_index(players, &(&1.id == player_id))
#     List.delete_at(players, index_to_delete)
#   end
# end
