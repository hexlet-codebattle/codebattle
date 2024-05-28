defmodule Codebattle.Tournament.TournamenResultTest do
  use Codebattle.DataCase, async: false

  alias Codebattle.Tournament.TournamentResult

  describe "get_player_results" do
    test "calculates results correctly by_player_95th_percentile" do
      [clan1, clan2, clan3, clan4, clan5, clan6, clan7, clan8] =
        Enum.map(1..8, fn i -> insert(:clan, name: "c#{i}", long_name: "l#{i}") end)

      task1 = insert(:task, level: "elementary", name: "t1")
      task2 = insert(:task, level: "easy", name: "t2")
      task3 = insert(:task, level: "medium", name: "t3")
      task4 = insert(:task, level: "hard", name: "t4")

      [user11, user12, user13, user14, user15, user16, user17] =
        Enum.map(1..7, fn i -> insert(:user, name: "u1#{i}", clan_id: clan1.id) end)

      [user21, user22, user23, user24, user25, user26] =
        Enum.map(1..6, fn i -> insert(:user, name: "u2#{i}", clan_id: clan2.id) end)

      [user31, user32, user33, user34, user35] =
        Enum.map(1..5, fn i -> insert(:user, name: "u3#{i}", clan_id: clan3.id) end)

      [user41, user42, user43, user44] =
        Enum.map(1..4, fn i -> insert(:user, name: "u4#{i}", clan_id: clan4.id) end)

      [user51, user52, user53] =
        Enum.map(1..3, fn i -> insert(:user, name: "u5#{i}", clan_id: clan5.id) end)

      [user61, user62] =
        Enum.map(1..2, fn i -> insert(:user, name: "u6#{i}", clan_id: clan6.id) end)

      user71 = insert(:user, name: "u71", clan_id: clan7.id)
      user81 = insert(:user, name: "u81", clan_id: clan8.id)

      tournament = insert(:tournament, type: "arena", ranking_type: "by_player_95th_percentile")

      insert_game(task4, tournament, user11, user21, 100, 100.0, 70.0)
      insert_game(task4, tournament, user12, user22, 200, 100.0, 60.0)
      insert_game(task4, tournament, user13, user23, 400, 100.0, 50.0)
      insert_game(task4, tournament, user14, user24, 600, 100.0, 40.0)
      insert_game(task4, tournament, user15, user25, 800, 100.0, 30.0)
      insert_game(task4, tournament, user16, user26, 1000, 100.0, 20.0)
      insert_game(task4, tournament, user17, user81, 1200, 100.0, 10.0)

      insert_game(task3, tournament, user11, user21, 100, 100.0, 90.0)
      insert_game(task3, tournament, user12, user22, 120, 100.0, 80.0)
      insert_game(task3, tournament, user13, user23, 140, 100.0, 70.0)
      insert_game(task3, tournament, user14, user24, 160, 100.0, 60.0)
      insert_game(task3, tournament, user31, user41, 180, 100.0, 50.0)
      insert_game(task3, tournament, user32, user42, 200, 100.0, 40.0)
      insert_game(task3, tournament, user33, user43, 220, 100.0, 30.0)
      insert_game(task3, tournament, user34, user44, 240, 100.0, 20.0)
      insert_game(task3, tournament, user35, user71, 260, 100.0, 10.0)

      insert_game(task2, tournament, user11, user21, 10, 100.0, 90.0)
      insert_game(task2, tournament, user12, user22, 12, 100.0, 80.0)
      insert_game(task2, tournament, user13, user23, 14, 100.0, 70.0)
      insert_game(task2, tournament, user51, user61, 16, 100.0, 60.0)
      insert_game(task2, tournament, user52, user62, 18, 100.0, 50.0)
      insert_game(task2, tournament, user53, user71, 20, 100.0, 40.0)

      insert_game(task1, tournament, user11, user21, 100, 100.0, 10.0)
      insert_game(task1, tournament, user71, user81, 10, 80.0, 10.0)

      TournamentResult.upsert_results(tournament)

      assert [
               %{
                 user_name: "u11",
                 user_id: _,
                 clan_id: _,
                 wins_count: 4,
                 clan_name: "c1",
                 total_score: 1430,
                 total_duration_sec: 310,
                 clan_rank: 1
               },
               %{
                 user_name: "u12",
                 user_id: _,
                 clan_id: _,
                 wins_count: 3,
                 clan_name: "c1",
                 total_score: 1326,
                 total_duration_sec: 332,
                 clan_rank: 1
               },
               %{
                 user_name: "u13",
                 user_id: _,
                 clan_id: _,
                 wins_count: 3,
                 clan_name: "c1",
                 total_score: 1153,
                 total_duration_sec: 554,
                 clan_rank: 1
               },
               %{
                 user_name: "u14",
                 user_id: _,
                 clan_id: _,
                 wins_count: 2,
                 clan_name: "c1",
                 total_score: 921,
                 total_duration_sec: 760,
                 clan_rank: 1
               },
               %{
                 user_name: "u15",
                 user_id: _,
                 clan_id: _,
                 wins_count: 1,
                 clan_name: "c1",
                 total_score: 562,
                 total_duration_sec: 800,
                 clan_rank: 1
               },
               %{
                 user_name: "u21",
                 user_id: _,
                 clan_id: _,
                 wins_count: 0,
                 clan_name: "c2",
                 total_score: 1063,
                 total_duration_sec: 310,
                 clan_rank: 2
               },
               %{
                 user_name: "u22",
                 user_id: _,
                 clan_id: _,
                 wins_count: 0,
                 clan_name: "c2",
                 total_score: 871,
                 total_duration_sec: 332,
                 clan_rank: 2
               },
               %{
                 user_name: "u23",
                 user_id: _,
                 clan_id: _,
                 wins_count: 0,
                 clan_name: "c2",
                 total_score: 643,
                 total_duration_sec: 554,
                 clan_rank: 2
               },
               %{
                 user_name: "u24",
                 user_id: _,
                 clan_id: _,
                 wins_count: 0,
                 clan_name: "c2",
                 total_score: 414,
                 total_duration_sec: 760,
                 clan_rank: 2
               },
               %{
                 user_name: "u25",
                 user_id: _,
                 clan_id: _,
                 wins_count: 0,
                 clan_name: "c2",
                 total_score: 169,
                 total_duration_sec: 800,
                 clan_rank: 2
               },
               %{
                 user_name: "u31",
                 user_id: _,
                 clan_id: _,
                 wins_count: 1,
                 clan_name: "c3",
                 total_score: 201,
                 total_duration_sec: 180,
                 clan_rank: 3
               },
               %{
                 user_name: "u32",
                 user_id: _,
                 clan_id: _,
                 wins_count: 1,
                 clan_name: "c3",
                 total_score: 173,
                 total_duration_sec: 200,
                 clan_rank: 3
               },
               %{
                 user_name: "u33",
                 user_id: _,
                 clan_id: _,
                 wins_count: 1,
                 clan_name: "c3",
                 total_score: 145,
                 total_duration_sec: 220,
                 clan_rank: 3
               },
               %{
                 user_name: "u34",
                 user_id: _,
                 clan_id: _,
                 wins_count: 1,
                 clan_name: "c3",
                 total_score: 118,
                 total_duration_sec: 240,
                 clan_rank: 3
               },
               %{
                 user_name: "u35",
                 user_id: _,
                 clan_id: _,
                 wins_count: 1,
                 clan_name: "c3",
                 total_score: 90,
                 total_duration_sec: 260,
                 clan_rank: 3
               },
               %{
                 user_name: "u41",
                 user_id: _,
                 clan_id: _,
                 wins_count: 0,
                 clan_name: "c4",
                 total_score: 100,
                 total_duration_sec: 180,
                 clan_rank: 4
               },
               %{
                 user_name: "u42",
                 user_id: _,
                 clan_id: _,
                 wins_count: 0,
                 clan_name: "c4",
                 total_score: 69,
                 total_duration_sec: 200,
                 clan_rank: 4
               },
               %{
                 user_name: "u43",
                 user_id: _,
                 clan_id: _,
                 wins_count: 0,
                 clan_name: "c4",
                 total_score: 44,
                 total_duration_sec: 220,
                 clan_rank: 4
               },
               %{
                 user_name: "u44",
                 user_id: _,
                 clan_id: _,
                 wins_count: 0,
                 clan_name: "c4",
                 total_score: 24,
                 total_duration_sec: 240,
                 clan_rank: 4
               },
               %{
                 user_name: "u51",
                 user_id: _,
                 clan_id: _,
                 wins_count: 1,
                 clan_name: "c5",
                 total_score: 59,
                 total_duration_sec: 16,
                 clan_rank: 5
               },
               %{
                 user_name: "u52",
                 user_id: _,
                 clan_id: _,
                 wins_count: 1,
                 clan_name: "c5",
                 total_score: 45,
                 total_duration_sec: 18,
                 clan_rank: 5
               },
               %{
                 user_name: "u53",
                 user_id: _,
                 clan_id: _,
                 wins_count: 1,
                 clan_name: "c5",
                 total_score: 30,
                 total_duration_sec: 20,
                 clan_rank: 5
               },
               %{
                 user_name: "u61",
                 user_id: _,
                 clan_id: _,
                 wins_count: 0,
                 clan_name: "c6",
                 total_score: 36,
                 total_duration_sec: 16,
                 clan_rank: 6
               },
               %{
                 user_name: "u62",
                 user_id: _,
                 clan_id: _,
                 wins_count: 0,
                 clan_name: "c6",
                 total_score: 22,
                 total_duration_sec: 18,
                 clan_rank: 6
               },
               %{
                 user_name: "u71",
                 user_id: _,
                 clan_id: _,
                 wins_count: 0,
                 clan_name: "c7",
                 total_score: 45,
                 total_duration_sec: 290,
                 clan_rank: 7
               }
             ] = TournamentResult.get_top_users_by_clan_ranking(tournament)

      assert [
               %{
                 max: Decimal.new("1200.00"),
                 min: Decimal.new("100.00"),
                 name: "t4",
                 level: "hard",
                 task_id: task4.id,
                 wins_count: 7,
                 p5: Decimal.new("250.00"),
                 p25: Decimal.new("250.00"),
                 p50: Decimal.new("600.00"),
                 p75: Decimal.new("1010.00"),
                 p95: Decimal.new("1200.00")
               },
               %{
                 max: Decimal.new("260.00"),
                 min: Decimal.new("100.00"),
                 name: "t3",
                 level: "medium",
                 task_id: task3.id,
                 wins_count: 9,
                 p5: Decimal.new("140.00"),
                 p25: Decimal.new("140.00"),
                 p50: Decimal.new("180.00"),
                 p75: Decimal.new("240.00"),
                 p95: Decimal.new("260.00")
               },
               %{
                 max: Decimal.new("20.00"),
                 min: Decimal.new("10.00"),
                 name: "t2",
                 level: "easy",
                 task_id: task2.id,
                 wins_count: 6,
                 p5: Decimal.new("12.00"),
                 p25: Decimal.new("12.00"),
                 p50: Decimal.new("15.00"),
                 p75: Decimal.new("18.70"),
                 p95: Decimal.new("20.00")
               },
               %{
                 max: Decimal.new("100.00"),
                 min: Decimal.new("10.00"),
                 name: "t1",
                 level: "elementary",
                 task_id: task1.id,
                 wins_count: 1,
                 p5: Decimal.new("10.00"),
                 p25: Decimal.new("10.00"),
                 p50: Decimal.new("55.00"),
                 p75: Decimal.new("100.00"),
                 p95: Decimal.new("100.00")
               }
             ] == TournamentResult.get_tasks_ranking(tournament)

      assert [
               %{clan_name: "c1", place: 1, score: 1000, user_id: _, user_name: "u11"},
               %{clan_id: _, clan_name: "c1", place: 2, score: 954, user_id: _, user_name: "u12"},
               %{clan_id: _, clan_name: "c1", place: 3, score: 823, user_id: _, user_name: "u13"},
               %{clan_id: _, clan_name: "c1", place: 4, score: 693, user_id: _, user_name: "u14"},
               %{clan_id: _, clan_name: "c1", place: 5, score: 562, user_id: _, user_name: "u15"},
               %{clan_id: _, clan_name: "c1", place: 6, score: 431, user_id: _, user_name: "u16"},
               %{clan_id: _, clan_name: "c1", place: 7, score: 300, user_id: _, user_name: "u17"}
             ] = TournamentResult.get_top_user_by_task_ranking(tournament, task4.id)

      assert [
               %{user_name: "u11", user_id: _, score: 300, clan_id: _, clan_name: "c1", place: 1},
               %{user_name: "u12", user_id: _, score: 283, clan_id: _, clan_name: "c1", place: 2},
               %{user_name: "u13", user_id: _, score: 256, clan_id: _, clan_name: "c1", place: 3},
               %{user_name: "u14", user_id: _, score: 228, clan_id: _, clan_name: "c1", place: 4},
               %{user_name: "u31", user_id: _, score: 201, clan_id: _, clan_name: "c3", place: 5},
               %{user_name: "u32", user_id: _, score: 173, clan_id: _, clan_name: "c3", place: 6},
               %{user_name: "u33", user_id: _, score: 145, clan_id: _, clan_name: "c3", place: 7},
               %{user_name: "u34", user_id: _, score: 118, clan_id: _, clan_name: "c3", place: 8},
               %{user_name: "u35", user_id: _, score: 90, clan_id: _, clan_name: "c3", place: 9}
             ] = TournamentResult.get_top_user_by_task_ranking(tournament, task3.id)

      assert [
               %{user_name: "u11", user_id: _, score: 100, clan_id: _, clan_name: "c1", place: 1},
               %{user_name: "u12", user_id: _, score: 89, clan_id: _, clan_name: "c1", place: 2},
               %{user_name: "u13", user_id: _, score: 74, clan_id: _, clan_name: "c1", place: 3},
               %{user_name: "u51", user_id: _, score: 59, clan_id: _, clan_name: "c5", place: 4},
               %{user_name: "u52", user_id: _, score: 45, clan_id: _, clan_name: "c5", place: 5},
               %{user_name: "u53", user_id: _, score: 30, clan_id: _, clan_name: "c5", place: 6}
             ] = TournamentResult.get_top_user_by_task_ranking(tournament, task2.id)

      assert [
               %{
                 user_name: "u11",
                 user_id: _,
                 score: 30,
                 clan_id: _,
                 clan_name: "c1",
                 place: 1,
                 clan_long_name: "l1"
               }
             ] =
               TournamentResult.get_top_user_by_task_ranking(tournament, task1.id)

      assert [%{start: 100, end: 110, wins_count: 1}] ==
               TournamentResult.get_task_duration_distribution(tournament, task1.id, 10)

      assert [
               %{start: 10, end: 13, wins_count: 2},
               %{start: 13, end: 16, wins_count: 1},
               %{start: 16, end: 19, wins_count: 2},
               %{start: 19, end: 22, wins_count: 1}
             ] == TournamentResult.get_task_duration_distribution(tournament, task2.id, 3)

      assert [
               %{start: 100, end: 115, wins_count: 1},
               %{start: 115, end: 130, wins_count: 1},
               %{start: 130, end: 145, wins_count: 1},
               %{start: 145, end: 160, wins_count: 0},
               %{start: 160, end: 175, wins_count: 1},
               %{start: 175, end: 190, wins_count: 1},
               %{start: 190, end: 205, wins_count: 1},
               %{start: 205, end: 220, wins_count: 0},
               %{start: 220, end: 235, wins_count: 1},
               %{start: 235, end: 250, wins_count: 1},
               %{start: 250, end: 265, wins_count: 1}
             ] == TournamentResult.get_task_duration_distribution(tournament, task3.id, 15)

      assert [
               %{start: 100, end: 220, wins_count: 2},
               %{start: 220, end: 340, wins_count: 0},
               %{start: 340, end: 460, wins_count: 1},
               %{start: 460, end: 580, wins_count: 0},
               %{start: 580, end: 700, wins_count: 1},
               %{start: 700, end: 820, wins_count: 1},
               %{start: 820, end: 940, wins_count: 0},
               %{start: 940, end: 1060, wins_count: 1},
               %{start: 1060, end: 1180, wins_count: 0},
               %{start: 1180, end: 1300, wins_count: 1}
             ] == TournamentResult.get_task_duration_distribution(tournament, task4.id, 120)

      assert [
               %{
                 clan_id: _,
                 clan_name: "c1",
                 clan_long_name: "l1",
                 performance: 874,
                 radius: 7,
                 total_score: 6123,
                 player_count: 7
               },
               %{
                 clan_id: _,
                 clan_name: "c2",
                 clan_long_name: "l2",
                 performance: 541,
                 radius: 6,
                 total_score: 3246,
                 player_count: 6
               },
               %{
                 clan_id: _,
                 clan_name: "c3",
                 clan_long_name: "l3",
                 performance: 145,
                 radius: 5,
                 total_score: 727,
                 player_count: 5
               },
               %{
                 clan_id: _,
                 clan_name: "c4",
                 clan_long_name: "l4",
                 performance: 59,
                 radius: 4,
                 total_score: 237,
                 player_count: 4
               },
               %{
                 clan_id: _,
                 clan_name: "c5",
                 clan_long_name: "l5",
                 performance: 44,
                 radius: 3,
                 total_score: 134,
                 player_count: 3
               },
               %{
                 clan_id: _,
                 clan_name: "c6",
                 clan_long_name: "l6",
                 performance: 29,
                 radius: 2,
                 total_score: 58,
                 player_count: 2
               },
               %{
                 clan_id: _,
                 clan_name: "c7",
                 clan_long_name: "l7",
                 performance: 45,
                 radius: 1,
                 total_score: 45,
                 player_count: 1
               },
               %{
                 clan_id: _,
                 clan_name: "c8",
                 clan_long_name: "l8",
                 performance: 33,
                 radius: 1,
                 total_score: 33,
                 player_count: 1
               }
             ] = TournamentResult.get_clans_bubble_distribution(tournament)
    end

    defp insert_game(task, tournament, user1, user2, duration_sec, percent1, percent2) do
      state =
        if percent1 == 100.0 or percent2 == 100.0 do
          "game_over"
        else
          "timeout"
        end

      insert(:game,
        state: state,
        level: task.level,
        duration_sec: duration_sec,
        players: build_players(user1, user2, percent1, percent2),
        tournament_id: tournament.id,
        task: task
      )
    end

    defp build_players(user1, user2, p1, p2) do
      [
        %{
          id: user1.id,
          name: user1.name,
          clan_id: user1.clan_id,
          result_percent: p1,
          result: get_result(p1)
        },
        %{
          id: user2.id,
          name: user2.name,
          clan_id: user2.clan_id,
          result_percent: p2,
          result: get_result(p2)
        }
      ]
    end

    def get_result(100.0), do: "won"
    def get_result(_), do: "lost"
  end
end
