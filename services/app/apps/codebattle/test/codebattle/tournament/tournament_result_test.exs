defmodule Codebattle.Tournament.TournamenResultTest do
  use Codebattle.DataCase, async: false

  alias Codebattle.Tournament.TournamentResult

  describe "get_player_results" do
    test "calculates results correctly by_player_95th_percentile" do
      [clan1, clan2, clan3, clan4] =
        Enum.map(1..4, fn i -> insert(:clan, name: "c#{i}", long_name: "l#{i}") end)

      task1 = insert(:task, level: "hard")
      task2 = insert(:task, level: "hard")
      user1 = insert(:user, name: "Alice", clan_id: clan1.id)
      user2 = insert(:user, name: "Tom", clan_id: clan2.id)
      user3 = insert(:user, name: "Bob", clan_id: clan1.id)
      user4 = insert(:user, name: "Jerry", clan_id: clan2.id)
      user5 = insert(:user, name: "Carol", clan_id: clan3.id)
      user6 = insert(:user, name: "Nancy", clan_id: clan4.id)
      user7 = insert(:user, name: "Dave", clan_id: clan3.id)
      user8 = insert(:user, name: "Laura", clan_id: clan4.id)
      user9 = insert(:user, name: "Eve", clan_id: clan1.id)
      user10 = insert(:user, name: "Sam", clan_id: clan3.id)
      user11 = insert(:user, name: "Alex", clan_id: clan2.id)
      user12 = insert(:user, name: "Elon", clan_id: clan4.id)

      tournament = insert(:tournament, type: "arena", ranking_type: "by_player_95th_percentile")

      insert(:game,
        state: "game_over",
        level: "hard",
        duration_sec: 100,
        players: build_players(user1, user2, [{100.0, "won"}, {75.0, "lost"}]),
        tournament_id: tournament.id,
        task: task1
      )

      insert(:game,
        state: "game_over",
        level: "hard",
        duration_sec: 120,
        players: build_players(user3, user4, [{100.0, "won"}, {65.0, "lost"}]),
        tournament_id: tournament.id,
        task: task1
      )

      insert(:game,
        state: "game_over",
        level: "hard",
        duration_sec: 300,
        players: build_players(user5, user6, [{100.0, "won"}, {55.0, "lost"}]),
        tournament_id: tournament.id,
        task: task1
      )

      insert(:game,
        state: "game_over",
        level: "hard",
        duration_sec: 600,
        players: build_players(user7, user8, [{100.0, "won"}, {40.0, "lost"}]),
        tournament_id: tournament.id,
        task: task2
      )

      insert(:game,
        state: "game_over",
        level: "hard",
        duration_sec: 700,
        players: build_players(user9, user10, [{100.0, "won"}, {10.0, "lost"}]),
        tournament_id: tournament.id,
        task: task2
      )

      insert(:game,
        state: "timeout",
        level: "hard",
        duration_sec: 900,
        players: build_players(user11, user12, [{0.0, "won"}, {0.0, "lost"}]),
        tournament_id: tournament.id,
        task: task2
      )

      TournamentResult.upsert_results(tournament)

      assert [
               %{
                 user_name: "Alice",
                 user_id: user1.id,
                 clan_id: clan1.id,
                 wins_count: 1,
                 clan_name: "c1",
                 clan_long_name: "l1",
                 clan_rank: 1,
                 total_score: 1000,
                 total_duration_sec: 100
               },
               %{
                 user_name: "Bob",
                 user_id: user3.id,
                 clan_id: clan1.id,
                 wins_count: 1,
                 clan_name: "c1",
                 clan_long_name: "l1",
                 clan_rank: 1,
                 total_score: 936,
                 total_duration_sec: 120
               },
               %{
                 user_name: "Eve",
                 user_id: user9.id,
                 clan_id: clan1.id,
                 wins_count: 1,
                 clan_name: "c1",
                 clan_long_name: "l1",
                 clan_rank: 1,
                 total_score: 300,
                 total_duration_sec: 700
               },
               %{
                 user_name: "Tom",
                 user_id: user2.id,
                 clan_id: clan2.id,
                 wins_count: 0,
                 clan_name: "c2",
                 clan_long_name: "l2",
                 clan_rank: 2,
                 total_score: 750,
                 total_duration_sec: 100
               },
               %{
                 user_name: "Jerry",
                 user_id: user4.id,
                 clan_id: clan2.id,
                 wins_count: 0,
                 clan_name: "c2",
                 clan_long_name: "l2",
                 clan_rank: 2,
                 total_score: 609,
                 total_duration_sec: 120
               },
               %{
                 user_name: "Alex",
                 user_id: user11.id,
                 clan_id: clan2.id,
                 wins_count: 0,
                 clan_name: "c2",
                 clan_long_name: "l2",
                 clan_rank: 2,
                 total_score: 0,
                 total_duration_sec: 900
               },
               %{
                 user_name: "Dave",
                 user_id: user7.id,
                 clan_id: clan3.id,
                 wins_count: 1,
                 clan_name: "c3",
                 clan_long_name: "l3",
                 clan_rank: 3,
                 total_duration_sec: 600,
                 total_score: 1000
               },
               %{
                 user_name: "Carol",
                 user_id: user5.id,
                 clan_id: clan3.id,
                 wins_count: 1,
                 clan_name: "c3",
                 clan_long_name: "l3",
                 clan_rank: 3,
                 total_score: 300,
                 total_duration_sec: 300
               },
               %{
                 user_name: "Sam",
                 user_id: user10.id,
                 clan_id: clan3.id,
                 wins_count: 0,
                 clan_name: "c3",
                 clan_long_name: "l3",
                 clan_rank: 3,
                 total_score: 30,
                 total_duration_sec: 700
               },
               %{
                 user_name: "Laura",
                 user_id: user8.id,
                 clan_id: clan4.id,
                 wins_count: 0,
                 clan_name: "c4",
                 clan_long_name: "l4",
                 clan_rank: 4,
                 total_score: 400,
                 total_duration_sec: 600
               },
               %{
                 user_name: "Nancy",
                 user_id: user6.id,
                 clan_id: clan4.id,
                 wins_count: 0,
                 clan_name: "c4",
                 clan_long_name: "l4",
                 clan_rank: 4,
                 total_score: 165,
                 total_duration_sec: 300
               },
               %{
                 user_name: "Elon",
                 user_id: user12.id,
                 clan_id: clan4.id,
                 wins_count: 0,
                 clan_name: "c4",
                 clan_long_name: "l4",
                 clan_rank: 4,
                 total_score: 0,
                 total_duration_sec: 900
               }
             ] == TournamentResult.get_top_users_ranking(tournament)

      assert [
               %{
                 user_name: "Alice",
                 user_id: user1.id,
                 score: 1000,
                 clan_id: clan1.id,
                 place: 1,
                 clan_name: "c1",
                 clan_long_name: "l1"
               },
               %{
                 user_name: "Bob",
                 user_id: user3.id,
                 score: 936,
                 clan_id: clan1.id,
                 place: 2,
                 clan_name: "c1",
                 clan_long_name: "l1"
               },
               %{
                 user_name: "Tom",
                 user_id: user2.id,
                 score: 750,
                 clan_id: clan2.id,
                 place: 3,
                 clan_name: "c2",
                 clan_long_name: "l2"
               },
               %{
                 user_name: "Jerry",
                 user_id: user4.id,
                 score: 609,
                 clan_id: clan2.id,
                 place: 4,
                 clan_name: "c2",
                 clan_long_name: "l2"
               },
               %{
                 user_name: "Carol",
                 user_id: user5.id,
                 score: 300,
                 clan_id: clan3.id,
                 place: 5,
                 clan_name: "c3",
                 clan_long_name: "l3"
               },
               %{
                 user_name: "Nancy",
                 user_id: user6.id,
                 score: 165,
                 clan_id: clan4.id,
                 place: 6,
                 clan_name: "c4",
                 clan_long_name: "l4"
               }
             ] == TournamentResult.get_user_task_ranking(tournament, task1.id)
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
