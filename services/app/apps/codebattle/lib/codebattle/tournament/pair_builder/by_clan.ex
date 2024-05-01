defmodule Codebattle.Tournament.PairBuilder.ByClan do
  @opaque player_id :: pos_integer()
  @opaque clan_id :: pos_integer()
  @opaque player :: {player_id(), clan_id()}
  @opaque pair :: list(player_id())

  @spec call(nonempty_list(player)) ::
          {pairs :: list(pair()), unmatched_player_ids :: list(player_id())}
  def call(players) do
    grouped_players =
      players
      |> Enum.group_by(&elem(&1, 1), &elem(&1, 0))
      |> Enum.map(fn {clan_id, player_ids} ->
        {clan_id, {length(player_ids), clan_id, player_ids}}
      end)
      |> Map.new()

    match_players(grouped_players, [])
  end

  defp match_players(players_map, pairs) when map_size(players_map) == 0 do
    {pairs, []}
  end

  defp match_players(players_map, pairs) when map_size(players_map) == 1 do
    [{_count, _clan_id, unmatched_player_ids}] = Map.values(players_map)

    {pairs, unmatched_player_ids}
  end

  defp match_players(players_map, pairs) do
    {{clan1_count, clan1_id, [player1_id | rest_players_clan1]},
     {clan2_count, clan2_id, [player2_id | rest_players_clan2]}} =
      players_map
      |> Map.values()
      |> Enum.min_max_by(&elem(&1, 0))
      |> case do
        {elem, elem} ->
          players_map
          |> Map.values()
          |> Enum.sort_by(&elem(&1, 0))
          |> Enum.take(2)
          |> List.to_tuple()

        value ->
          value
      end

    new_players_map =
      players_map
      |> then(fn pm ->
        if clan1_count == 1 do
          Map.delete(pm, clan1_id)
        else
          Map.put(pm, clan1_id, {clan1_count - 1, clan1_id, rest_players_clan1})
        end
      end)

    new_players_map =
      new_players_map
      |> then(fn pm ->
        if clan2_count == 1 do
          Map.delete(pm, clan2_id)
        else
          Map.put(pm, clan2_id, {clan2_count - 1, clan2_id, rest_players_clan2})
        end
      end)

    match_players(new_players_map, [[player1_id, player2_id] | pairs])
  end
end
