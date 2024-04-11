defmodule Codebattle.WaitingRoom.Engine do
  alias Codebattle.WaitingRoom.State

  require Logger

  @spec call(State.t()) :: State.t()
  def call(%State{players: []}), do: {[], []}

  def call(state = %State{}) do
    Logger.debug("WREngine match players " <> inspect(state.players))

    state
    |> set_now()
    |> filter_new()
    |> maybe_filter_score()
    |> build_groups()
    |> match_groups()
    |> maybe_match_with_played()
    |> maybe_match_with_bots()
    |> set_match_result()
  end

  defp set_now(state), do: %{state | now: :os.system_time(:seconds)}

  defp filter_new(state) do
    threshold = state.now - state.min_time_sec
    {groups, unmatched} = Enum.split_with(state.players, &(&1.joined <= threshold))
    %{state | groups: groups, unmatched: unmatched}
  end

  defp maybe_filter_score(state = %{use_score?: true}) do
    %{state | groups: Enum.sort_by(state.groups, & &1.score, :desc)}
  end

  defp maybe_filter_score(state), do: state

  defp build_groups(state) do
    %{
      state
      | groups: do_build_groups(state, state.groups)
    }
  end

  defp do_build_groups(%{use_same_tasks?: true}, groups) do
    groups
    |> Enum.group_by(& &1.tasks)
    |> Map.values()
  end

  defp do_build_groups(_state, groups), do: [groups]

  defp match_groups(state) do
    state
    |> do_match_groups()
    |> then(fn {pairs, unmatched} ->
      %{
        state
        | pairs: pairs,
          unmatched: state.unmatched ++ unmatched,
          groups: [],
          played_pair_ids: MapSet.union(state.played_pair_ids, MapSet.new(pairs))
      }
    end)
  end

  defp do_match_groups(state) do
    state.groups
    |> Enum.map(&match_group(state, &1, [], []))
    |> Enum.reduce({[], []}, fn {pairs, unmatched}, {acc_pairs, acc_unmatched} ->
      {Enum.concat(pairs, acc_pairs), Enum.concat(unmatched, acc_unmatched)}
    end)
  end

  defp maybe_match_with_played(state = %{use_played_pairs?: false}) do
    state
  end

  defp maybe_match_with_played(state) do
    threshold = state.now - state.min_time_with_played_sec

    {match_with_played, wait_more} =
      Enum.split_with(state.unmatched, &(&1.joined <= threshold))

    {pairs, unmatched} =
      do_match_groups(%{
        state
        | use_played_pairs?: false,
          groups: do_build_groups(state, match_with_played)
      })

    %{
      state
      | unmatched: Enum.concat(wait_more, unmatched),
        pairs: Enum.concat(state.pairs, pairs)
    }
  end

  defp maybe_match_with_bots(state = %{use_match_with_bots?: false}) do
    state
  end

  defp maybe_match_with_bots(state) do
    threshold = state.now - state.min_time_with_bot_sec

    {match_with_bot, unmatched} =
      Enum.split_with(state.unmatched, &(&1.joined <= threshold))

    %{
      state
      | unmatched: unmatched,
        matched_with_bot: Enum.map(match_with_bot, & &1.id)
    }
  end

  defp set_match_result(state) do
    %{state | players: state.unmatched, unmatched: []}
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

  defp match_group(state = %{use_played_pairs?: true}, [p1, p2], pairs, unmatched) do
    pair = Enum.sort([p1.id, p2.id])

    if MapSet.member?(state.played_pair_ids, pair) do
      {pairs, [p1, p2 | unmatched]}
    else
      {[pair | pairs], unmatched}
    end
  end

  defp match_group(_state, [p1, p2], pairs, unmatched) do
    {[Enum.sort([p1.id, p2.id]) | pairs], unmatched}
  end

  defp match_group(state, [p1 | remained_players], pairs, unmatched) do
    Enum.reduce_while(
      remained_players,
      nil,
      fn p2, _acc ->
        cond do
          state.use_played_pairs? &&
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
        match_group(state, remained_players, [Enum.sort(new_pair) | pairs], unmatched)

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
