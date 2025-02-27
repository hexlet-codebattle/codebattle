defmodule Codebattle.Tournament.Swiss do
  @moduledoc false
  use Codebattle.Tournament.Base

  alias Codebattle.Bot
  alias Codebattle.Tournament

  @impl Tournament.Base
  def game_type, do: "duo"

  @impl Tournament.Base
  def complete_players(tournament) do
    # just for the UI test
    # bots = Bot.Context.build_list(30)
    # add_players(tournament, %{users: bots})
    tournament
  end

  @impl Tournament.Base
  def reset_meta(meta), do: meta

  @impl Tournament.Base
  def finish_round_after_match?(%{current_round_position: current_round_position} = tournament) do
    matches = get_round_matches(tournament, current_round_position)

    Enum.all?(matches, &(&1.state != "playing"))
  end

  @impl Tournament.Base
  def set_ranking(tournament) do
    Tournament.Ranking.set_ranking(tournament)
  end

  @impl Tournament.Base
  def calculate_round_results(tournament) do
    tournament
  end

  @impl Tournament.Base
  def build_round_pairs(tournament) do
    {player_pairs, unmatched_players, played_pair_ids} = build_player_pairs(tournament)

    opponent_bot = Tournament.Player.new!(Bot.Context.build())

    unmatched_pairs = Enum.map(unmatched_players, fn player -> [player, opponent_bot] end)

    {
      update_struct(tournament, %{played_pair_ids: played_pair_ids}),
      Enum.concat(player_pairs, unmatched_pairs)
    }
  end

  @impl Tournament.Base
  def finish_tournament?(tournament) do
    tournament.meta.rounds_limit - 1 == tournament.current_round_position
  end

  @impl Tournament.Base
  def maybe_create_rematch(tournament, game_params) do
    Codebattle.PubSub.broadcast("tournament:game:wait", %{
      game_id: game_params.game_id,
      type: get_wait_type(tournament)
    })

    tournament
  end

  defp get_wait_type(tournament) do
    if finish_tournament?(tournament) do
      "tournament"
    else
      "round"
    end
  end

  defp build_player_pairs(%{current_round_position: 0} = tournament) do
    played_pair_ids = MapSet.new()

    player_pairs =
      tournament
      |> get_players()
      |> Enum.sort_by(& &1.id)
      |> Enum.chunk_every(2)

    {player_pairs, unmatched_players} =
      player_pairs
      |> List.last()
      |> case do
        [player] -> {List.delete_at(player_pairs, -1), [player]}
        _ -> {player_pairs, []}
      end

    {player_pairs, unmatched_players, played_pair_ids}
  end

  defp build_player_pairs(tournament) do
    played_pair_ids = MapSet.new(tournament.played_pair_ids)

    sorted_players =
      tournament
      |> get_players()
      |> Enum.filter(&(&1.id > 0))
      |> Enum.sort_by(& &1.score, :desc)

    {player_pairs, unmatched_players, played_pair_ids} =
      build_new_pairs(sorted_players, [], played_pair_ids)

    {Enum.reverse(player_pairs), unmatched_players, played_pair_ids}
  end

  def build_new_pairs([], player_pairs, played_pair_ids) do
    {player_pairs, [], played_pair_ids}
  end

  def build_new_pairs([unmatched_player], player_pairs, played_pair_ids) do
    {player_pairs, [unmatched_player], played_pair_ids}
  end

  def build_new_pairs([p1, p2], player_pairs, played_pair_ids) do
    pair_ids = Enum.sort([p1.id, p2.id])

    {[[p1, p2] | player_pairs], [], MapSet.put(played_pair_ids, pair_ids)}
  end

  def build_new_pairs([player | remain_players], player_pairs, played_pair_ids) do
    {player_pair, pair_ids, remain_players} =
      remain_players
      |> Enum.reduce_while(
        {player, remain_players, played_pair_ids},
        fn candidate, _acc ->
          pair_ids = Enum.sort([player.id, candidate.id])

          if MapSet.member?(played_pair_ids, pair_ids) do
            {:cont, {player, remain_players, played_pair_ids}}
          else
            {:halt, {:new, [player, candidate], pair_ids, drop_player(remain_players, candidate.id)}}
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
