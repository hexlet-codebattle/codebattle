defmodule Codebattle.Tournament.Ranking.ByUserTest do
  use Codebattle.DataCase, async: true

  alias Codebattle.Tournament.Player
  alias Codebattle.Tournament.Players
  alias Codebattle.Tournament.Ranking
  alias Codebattle.Tournament.Ranking.ByUser

  test "set_places_with_score_to_players updates place and score without overwriting lang" do
    tournament_id = System.unique_integer([:positive])

    tournament = %{
      type: "swiss",
      players_table: Players.create_table(tournament_id),
      ranking_table: Ranking.create_table(tournament_id)
    }

    player =
      Player.new!(%{
        id: 101,
        name: "player-101",
        lang: "python",
        state: "active"
      })

    Players.put_player(tournament, player)

    ByUser.set_places_with_score_to_players(tournament, [
      %{id: 101, place: 2, score: 33, lang: "js"}
    ])

    assert %{place: 2, score: 33, lang: "python"} = Players.get_player(tournament, 101)
  end
end
