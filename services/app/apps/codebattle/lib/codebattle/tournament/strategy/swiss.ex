defmodule Codebattle.Tournament.Swiss do
  use Codebattle.Tournament.Base

  alias Codebattle.Bot
  alias Codebattle.Tournament

  @impl Tournament.Base
  def complete_players(tournament) do
    if rem(players_count(tournament), 2) == 0 do
      tournament
    else
      # bots = Bot.Context.build_list(21)
      # add_players(tournament, %{users: bots})
      bot = Bot.Context.build()
      add_players(tournament, %{users: [bot]})
    end
  end

  @impl Tournament.Base
  def default_meta(), do: %{rounds_limit: 3}

  @impl Tournament.Base
  def calculate_round_results(t), do: t

  @impl Tournament.Base
  def round_ends_by_time?(_t), do: true

  @impl Tournament.Base
  def build_matches(tournament) do
    {player_pairs, played_pair_ids} = build_round_pairs(tournament)

    new_matches =
      player_pairs
      |> Enum.with_index(Enum.count(tournament.matches))
      |> Enum.map(fn {[p1, p2], index} ->
        game_id =
          create_game(tournament, index, [Tournament.Player.new!(p1), Tournament.Player.new!(p2)])

        %Tournament.Match{
          id: index,
          game_id: game_id,
          state: "playing",
          player_ids: Enum.sort([p1.id, p2.id]),
          round: tournament.current_round
        }
      end)

    matches =
      Enum.reduce(new_matches, tournament.matches, fn match, acc ->
        Map.put(acc, to_id(match.id), match)
      end)

    update_struct(tournament, %{matches: matches, played_pair_ids: played_pair_ids})
  end

  @impl Tournament.Base
  def finish_tournament?(tournament) do
    tournament.meta.rounds_limit - 1 == tournament.current_round
  end

  defp build_round_pairs(tournament) do
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
