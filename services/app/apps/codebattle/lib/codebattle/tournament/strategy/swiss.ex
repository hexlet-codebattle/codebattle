defmodule Codebattle.Tournament.Swiss do
  use Codebattle.Tournament.Base

  alias Codebattle.Bot
  alias Codebattle.Tournament

  @impl Tournament.Base
  def complete_players(tournament) do
    if rem(players_count(tournament), 2) == 0 do
      tournament
    else
      bot = Tournament.Player.new!(Bot.Context.build())
      # TODO: FIXME
      IO.inspect(11_111_111_111)
      IO.inspect(bot)

      Codebattle.PubSub.broadcast("tournament:player:joined", %{
        tournament_id: tournament.id,
        player: bot
      })

      add_players(tournament, %{users: [bot]})
    end
  end

  @impl Tournament.Base
  def default_meta(), do: %{rounds_limit: 3}

  @impl Tournament.Base
  def calculate_round_results(tournament) do
    # TODO: improve  index with same score should be the same
    # now we just use random

    sorted_players_with_index =
      tournament
      |> get_players()
      |> Enum.sort_by(& &1.score, :desc)
      |> Enum.with_index()

    players =
      sorted_players_with_index
      |> Enum.map(fn {player, index} ->
        {to_id(player.id), %{player | place: index}}
      end)
      |> Enum.into(%{})

    top_player_ids =
      sorted_players_with_index
      |> Enum.take(30)
      |> Enum.map(fn {player, index} -> %{player | place: index} end)

    update_struct(%{tournament | players: players}, %{top_player_ids: top_player_ids})
  end

  @impl Tournament.Base
  def build_round_pairs(tournament) do
    {player_pairs, new_played_pair_ids} = build_player_pairs(tournament)

    {
      update_struct(tournament, %{played_pair_ids: new_played_pair_ids}),
      player_pairs
    }
  end

  @impl Tournament.Base
  def finish_tournament?(tournament) do
    tournament.meta.rounds_limit - 1 == tournament.current_round
  end

  defp build_player_pairs(tournament) do
    played_pair_ids = MapSet.new(tournament.played_pair_ids)

    sorted_players =
      tournament
      |> get_players()
      |> Enum.sort_by(& &1.score, :desc)

    {player_pairs, played_pair_ids} = build_new_pairs(sorted_players, [], played_pair_ids)

    {Enum.reverse(player_pairs), played_pair_ids}
  end

  def build_new_pairs([], player_pairs, played_pair_ids) do
    {player_pairs, played_pair_ids}
  end

  def build_new_pairs([p1, p2], player_pairs, played_pair_ids) do
    pair_ids = [p1.id, p2.id] |> Enum.sort()

    {[[p1, p2] | player_pairs], MapSet.put(played_pair_ids, pair_ids)}
  end

  def build_new_pairs([player | remain_players], player_pairs, played_pair_ids) do
    {player_pair, pair_ids, remain_players} =
      Enum.reduce_while(
        remain_players,
        {player, remain_players, played_pair_ids},
        fn candidate, _acc ->
          pair_ids = Enum.sort([player.id, candidate.id])

          if MapSet.member?(played_pair_ids, pair_ids) do
            {:cont, {player, remain_players, played_pair_ids}}
          else
            {:halt,
             {:new, [player, candidate], pair_ids, drop_player(remain_players, candidate.id)}}
          end
        end
      )
      |> case do
        {:new, player_pair, pair_ids, remain_players} ->
          {player_pair, pair_ids, remain_players}

        {player, [candidate | rest_players], _played_pair_ids} ->
          {
            [player, candidate],
            [player.id, candidate.id] |> Enum.map(& &1.id) |> Enum.sort(),
            rest_players
          }
      end

    build_new_pairs(
      remain_players,
      [player_pair | player_pairs],
      MapSet.put(played_pair_ids, pair_ids)
    )
  end

  defp drop_player(players, player_id) do
    index_to_delete = Enum.find_index(players, &(&1.id == player_id))
    List.delete_at(players, index_to_delete)
  end
end
