defmodule Codebattle.WaitingRoom.Engine do
  alias Codebattle.WaitingRoom.State

  require Logger

  @spec call(State.t()) :: State.t()
  def call(%State{players: []}), do: {[], []}

  def call(state = %State{}) do
    Logger.debug("WREngine match players " <> inspect(state.players))

    state
    |> Map.get(:players)
    |> filter_new(state)
    |> maybe_filter_score(state)
    |> build_groups(state)
    |> match_groups(state)
    |> Enum.reduce({[], []}, fn {pairs, unmatched}, {acc_pairs, acc_unmatched} ->
      {Enum.concat(pairs, acc_pairs), Enum.concat(unmatched, acc_unmatched)}
    end)
  end

  defp filter_new(players, state) do
    threshold = :os.system_time(:seconds) - state.min_time_sec
    Enum.filter(players, &(&1.joined <= threshold))
  end

  defp maybe_filter_score(players, %{use_score?: true}) do
    Enum.sort_by(players, & &1.score, :desc)
  end

  defp maybe_filter_score(players, _state), do: players

  defp build_groups(players, %{use_same_tasks?: true}) do
    players
    |> Enum.group_by(& &1.tasks)
    |> Map.values()
  end

  defp build_groups(players, _state), do: [players]

  defp match_groups(groups, state) do
    Enum.map(groups, &match_group(state, &1, [], []))
  end

  defp match_group(_state, [], pairs, unmatched) do
    {pairs, unmatched}
  end

  defp match_group(_state, [player], pairs, unmatched) do
    {pairs, [player | unmatched]}
  end

  defp match_group(
         %{use_clan?: true},
         [p1 = %{clan_id: c1_id}, p2 = %{clan_id: c2_id}],
         pairs,
         unmatched
       )
       when c1_id == c2_id do
    {pairs, [p1, p2 | unmatched]}
  end

  defp match_group(state, [p1, p2], pairs, unmatched) do
    if MapSet.member?(state.played_pair_ids, Enum.sort([p1.id, p2.id])) do
      {pairs, [p1, p2 | unmatched]}
    else
      {[[p1.id, p2.id] | pairs], unmatched}
    end
  end

  defp match_group(state, [p1 | remained_players], pairs, unmatched) do
    Enum.reduce_while(
      remained_players,
      nil,
      fn p2, _acc ->
        cond do
          MapSet.member?(state.played_pair_ids, Enum.sort([p1.id, p2.id])) ->
            {:cont, :no_match}

          state.use_clan? and p1.clan_id == p2.clan_id ->
            {:cont, :no_match}

          true ->
            {:halt, {:match, [p1.id, p2.id], drop_player(remained_players, p2.id)}}
        end
      end
    )
    |> case do
      # if it found a new player from another clan
      # then build a new pair
      {:match, new_pair, remained_players} ->
        match_group(state, remained_players, [new_pair | pairs], unmatched)

      # if it didn't find a new player from another clan
      # then put into unmatched_player_ids
      :no_match ->
        match_group(state, remained_players, pairs, [p1 | unmatched])
    end
  end

  defp drop_player(players, player_id) do
    index_to_delete = Enum.find_index(players, &(&1.id == player_id))
    List.delete_at(players, index_to_delete)
  end
end
