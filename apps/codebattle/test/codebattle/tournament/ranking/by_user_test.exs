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

  test "set_ranking applies only current round delta to cumulative standings" do
    tournament_id = System.unique_integer([:positive])

    tournament =
      :tournament
      |> insert(
        id: tournament_id,
        type: "swiss",
        ranking_type: "by_user",
        state: "active",
        current_round_position: 1
      )
      |> Map.merge(%{
        players_table: Players.create_table(tournament_id),
        ranking_table: Ranking.create_table(tournament_id)
      })

    Players.put_player(
      tournament,
      Player.new!(%{
        id: 101,
        name: "player-101",
        lang: "js",
        state: "active",
        score: 10,
        total_duration_sec: 100,
        last_ranked_round_position: 0
      })
    )

    Players.put_player(
      tournament,
      Player.new!(%{
        id: 102,
        name: "player-102",
        lang: "rb",
        state: "active",
        score: 10,
        total_duration_sec: 120,
        last_ranked_round_position: 0
      })
    )

    insert(:tournament_result,
      tournament_id: tournament.id,
      user_id: 101,
      user_name: "player-101",
      user_lang: "js",
      score: 5,
      duration_sec: 15,
      round_position: 1
    )

    insert(:tournament_result,
      tournament_id: tournament.id,
      user_id: 102,
      user_name: "player-102",
      user_lang: "rb",
      score: 5,
      duration_sec: 10,
      round_position: 1
    )

    ByUser.set_ranking(tournament)

    assert %{score: 15, total_duration_sec: 115, place: 1} = Players.get_player(tournament, 101)
    assert %{score: 15, total_duration_sec: 130, place: 2} = Players.get_player(tournament, 102)
    assert [%{id: 101, place: 1}, %{id: 102, place: 2}] = Ranking.get_first(tournament, 2)
  end

  test "set_ranking does not apply the same round delta twice" do
    tournament_id = System.unique_integer([:positive])

    tournament =
      :tournament
      |> insert(
        id: tournament_id,
        type: "swiss",
        ranking_type: "by_user",
        state: "active",
        current_round_position: 0
      )
      |> Map.merge(%{
        players_table: Players.create_table(tournament_id),
        ranking_table: Ranking.create_table(tournament_id)
      })

    Players.put_player(
      tournament,
      Player.new!(%{
        id: 101,
        name: "player-101",
        lang: "js",
        state: "active"
      })
    )

    insert(:tournament_result,
      tournament_id: tournament.id,
      user_id: 101,
      user_name: "player-101",
      user_lang: "js",
      score: 7,
      duration_sec: 11,
      round_position: 0
    )

    ByUser.set_ranking(tournament)
    ByUser.set_ranking(tournament)

    assert %{score: 7, total_duration_sec: 11, last_ranked_round_position: 0} =
             Players.get_player(tournament, 101)
  end
end
