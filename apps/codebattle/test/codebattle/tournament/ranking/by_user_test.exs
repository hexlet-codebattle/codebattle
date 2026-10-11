defmodule Codebattle.Tournament.Ranking.ByUserTest do
  use Codebattle.DataCase, async: true

  alias Codebattle.Tournament.Player
  alias Codebattle.Tournament.Players
  alias Codebattle.Tournament.Ranking
  alias Codebattle.Tournament.Ranking.ByUser

  test "a join after a departure appends without overwriting a remaining player's place" do
    tournament = %{
      type: "ladder",
      ranking_type: "by_user",
      state: "active",
      ranking_table: Ranking.create_table(System.unique_integer([:positive]))
    }

    for id <- 1..3, do: ByUser.add_new_player(tournament, Player.new!(%{id: id, name: "p#{id}"}))
    Ranking.drop_player(tournament, 2)
    ByUser.add_new_player(tournament, Player.new!(%{id: 4, name: "p4"}))

    assert Enum.map(Ranking.get_first(tournament, 10), & &1.id) == [1, 3, 4]
    assert Ranking.get_by_id(tournament, 3).place == 3
    assert Ranking.get_by_id(tournament, 4).place == 4
  end

  test "a new round without results preserves cumulative score and duration ordering" do
    tournament =
      :tournament
      |> insert(type: "ladder", state: "active", current_round_position: 2)
      |> Map.merge(%{
        players_table: Players.create_table(System.unique_integer([:positive])),
        ranking_table: Ranking.create_table(System.unique_integer([:positive]))
      })

    for {id, score, duration} <- [{1, 5, 10}, {2, 20, 40}, {3, 20, 30}] do
      Players.put_player(tournament, Player.new!(%{id: id, name: "p#{id}", score: score, total_duration_sec: duration}))
    end

    ByUser.set_ranking(tournament)

    assert Enum.map(Ranking.get_first(tournament, 3), & &1.id) == [3, 2, 1]
    assert %{score: 20, place: 1, total_duration_sec: 30} = Players.get_player(tournament, 3)
  end

  test "waiting participants are seeded by id before results exist" do
    tournament =
      :tournament
      |> insert(type: "swiss", state: "waiting_participants", current_round_position: 0)
      |> Map.merge(%{
        players_table: Players.create_table(System.unique_integer([:positive])),
        ranking_table: Ranking.create_table(System.unique_integer([:positive]))
      })

    for {id, score} <- [{1, 0}, {2, 20}] do
      Players.put_player(tournament, Player.new!(%{id: id, name: "p#{id}", score: score}))
    end

    ByUser.set_ranking(tournament)

    assert Enum.map(Ranking.get_first(tournament, 2), & &1.id) == [1, 2]
  end

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
      %{id: 101, place: 2, score: 33, lang: "js"},
      %{id: 999, place: 3, score: 1, lang: "rb"}
    ])

    assert %{place: 2, score: 33, lang: "python"} = Players.get_player(tournament, 101)
  end

  test "handles missing players and inactive tournament additions" do
    tournament_id = System.unique_integer([:positive])

    tournament = %{
      type: "swiss",
      state: "finished",
      ranking_table: Ranking.create_table(tournament_id),
      players_table: Players.create_table(tournament_id)
    }

    player = Player.new!(%{id: 20, name: "late", state: "active"})
    assert ByUser.get_by_player(tournament, nil) == nil
    assert ByUser.get_nearest_page_by_player(tournament, nil).page_number == 1
    assert ByUser.get_nearest_page_by_player(tournament, player).page_number == 1
    assert ByUser.add_new_player(tournament, player) == tournament
    assert ByUser.update_player_result(tournament, player, 10) == tournament
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
