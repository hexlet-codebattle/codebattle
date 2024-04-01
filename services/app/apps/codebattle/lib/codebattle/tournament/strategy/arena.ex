defmodule Codebattle.Tournament.Arena do
  use Codebattle.Tournament.Base

  alias Codebattle.Bot
  alias Codebattle.Tournament

  @impl Tournament.Base
  def game_type, do: "duo"

  @impl Tournament.Base
  def complete_players(tournament) do
    if rem(players_count(tournament), 2) == 0 do
      tournament
    else
      bot = Tournament.Player.new!(Bot.Context.build())

      Codebattle.PubSub.broadcast("tournament:player:joined", %{
        tournament: tournament,
        player: bot
      })

      add_players(tournament, %{users: [bot]})
    end
  end

  @impl Tournament.Base
  def reset_meta(meta), do: meta

  @impl Tournament.Base
  def calculate_round_results(tournament) do
    # TODO: improve  index with same score should be the same
    # now we just use random

    sorted_players_with_index =
      tournament
      |> get_players()
      |> Enum.sort_by(& &1.score, :desc)

    sorted_players_with_index
    |> Enum.with_index()
    |> Enum.each(fn {player, index} ->
      Tournament.Players.put_player(tournament, %{player | place: index})
    end)

    top_player_ids =
      sorted_players_with_index
      |> Enum.take(30)
      |> Enum.map(& &1.id)

    %{tournament | top_player_ids: top_player_ids}
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
    tournament.meta.rounds_limit - 1 == tournament.current_round_position
  end

  defp build_player_pairs(tournament = %{meta: %{use_clan: true}}) do
    # played_pair_ids = MapSet.new(tournament.played_pair_ids)
    # Tournament.PairBuilder.ByClan.call(get_players(tournament))
    tournament
  end

  defp build_player_pairs(tournament) do
    # played_pair_ids = MapSet.new(tournament.played_pair_ids)
    # Tournament.PairBuilder.ByScore.call(get_players(tournament), played_pair_ids)
    tournament
  end
end
