defmodule Codebattle.Tournament.TournamenResultTest do
  use Codebattle.DataCase, async: false

  alias Codebattle.Tournament.TournamentResult

  describe "get_player_results" do
    test "calculates results correctly by_player_95th_percentile" do
      task = insert(:task, level: "hard")
      user1 = insert(:user, name: "Alice", clan_id: 1)
      user2 = insert(:user, name: "Tom", clan_id: 2)
      user3 = insert(:user, name: "Bob", clan_id: 1)
      user4 = insert(:user, name: "Jerry", clan_id: 2)
      user5 = insert(:user, name: "Carol", clan_id: 3)
      user6 = insert(:user, name: "Nancy", clan_id: 4)
      user7 = insert(:user, name: "Dave", clan_id: 3)
      user8 = insert(:user, name: "Laura", clan_id: 4)
      user9 = insert(:user, name: "Eve", clan_id: 1)
      user10 = insert(:user, name: "Sam", clan_id: 3)
      user11 = insert(:user, name: "Alex", clan_id: 2)
      user12 = insert(:user, name: "Elon", clan_id: 4)

      tournament = insert(:tournament, type: "arena", ranking_type: "by_player_95th_percentile")

      insert(:game,
        state: "game_over",
        level: "hard",
        duration_sec: 100,
        players: build_players(user1, user2, [{100.0, "won"}, {75.0, "lost"}]),
        tournament_id: tournament.id,
        task: task
      )

      insert(:game,
        state: "game_over",
        level: "hard",
        duration_sec: 120,
        players: build_players(user3, user4, [{100.0, "won"}, {65.0, "lost"}]),
        tournament_id: tournament.id,
        task: task
      )

      insert(:game,
        state: "game_over",
        level: "hard",
        duration_sec: 300,
        players: build_players(user5, user6, [{100.0, "won"}, {55.0, "lost"}]),
        tournament_id: tournament.id,
        task: task
      )

      insert(:game,
        state: "game_over",
        level: "hard",
        duration_sec: 600,
        players: build_players(user7, user8, [{100.0, "won"}, {40.0, "lost"}]),
        tournament_id: tournament.id,
        task: task
      )

      insert(:game,
        state: "game_over",
        level: "hard",
        duration_sec: 700,
        players: build_players(user9, user10, [{100.0, "won"}, {10.0, "lost"}]),
        tournament_id: tournament.id,
        task: task
      )

      insert(:game,
        state: "timeout",
        level: "hard",
        duration_sec: 900,
        players: build_players(user11, user12, [{0.0, "won"}, {0.0, "lost"}]),
        tournament_id: tournament.id,
        task: task
      )

      TournamentResult.upsert_results(tournament)

      assert [
               %{score: 1000, place: 1},
               %{score: 750, place: 4},
               %{score: 981, place: 2},
               %{score: 638, place: 5},
               %{score: 770, place: 3},
               %{score: 423, place: 6},
               %{score: 417, place: 7},
               %{score: 167, place: 9},
               %{score: 300, place: 8},
               %{score: 30, place: 10},
               %{score: 0, place: 11},
               %{score: 0, place: 11}
             ] = TournamentResult.get_player_results(tournament) |> Enum.sort_by(& &1.player_id)
    end

    def build_players(user1, user2, [{p1, r1}, {p2, r2}]) do
      [
        %{
          id: user1.id,
          name: user1.name,
          clan_id: user1.clan_id,
          result_percent: p1,
          result: r1
        },
        %{
          id: user2.id,
          name: user2.name,
          clan_id: user2.clan_id,
          result_percent: p2,
          result: r2
        }
      ]
    end
  end
end
