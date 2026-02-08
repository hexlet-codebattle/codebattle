defmodule Codebattle.Tournament.TournamenResultTest do
  use Codebattle.DataCase, async: false

  alias Codebattle.Repo
  alias Codebattle.Tournament.TournamentResult

  describe "get_player_results" do
    test "aggregates ranking by user when language changes" do
      tournament = insert(:tournament, type: "swiss", ranking_type: "by_user", use_clan: false)
      user = insert(:user, name: "u1")
      user_id = user.id

      Repo.insert_all(TournamentResult, [
        %{
          tournament_id: tournament.id,
          user_id: user.id,
          user_name: user.name,
          user_lang: "js",
          score: 100,
          duration_sec: 30,
          round_position: 0,
          game_id: 1,
          task_id: 1,
          level: "easy",
          result_percent: Decimal.new("100"),
          clan_id: nil,
          was_cheated: false
        },
        %{
          tournament_id: tournament.id,
          user_id: user.id,
          user_name: user.name,
          user_lang: "python",
          score: 200,
          duration_sec: 40,
          round_position: 1,
          game_id: 2,
          task_id: 2,
          level: "easy",
          result_percent: Decimal.new("100"),
          clan_id: nil,
          was_cheated: false
        }
      ])

      assert %{^user_id => %{score: 300, place: 1}} = TournamentResult.get_user_ranking(tournament)
    end

    test "calculates results correctly by_percentile" do
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

      tournament =
        insert(:tournament, type: "swiss", ranking_type: "by_user", use_clan: false)

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
      insert_game(task1, tournament, user71, user81, 10, 80.0, 5.0)

      TournamentResult.upsert_results(tournament)

      assert [
               %{clan: "c1", name: "u11", place: 1, score: 1105},
               %{clan: "c1", name: "u12", place: 2, score: 857},
               %{clan: "c1", name: "u13", place: 3, score: 783},
               %{clan: "c2", name: "u21", place: 4, score: 714},
               %{clan: "c1", name: "u14", place: 5, score: 692},
               %{clan: "c2", name: "u22", place: 6, score: 572},
               %{clan: "c2", name: "u23", place: 7, score: 445},
               %{clan: "c1", name: "u15", place: 8, score: 409},
               %{clan: "c1", name: "u16", place: 9, score: 355},
               %{clan: "c2", name: "u24", place: 10, score: 321},
               %{clan: "c1", name: "u17", place: 11, score: 300},
               %{clan: "c3", name: "u31", place: 12, score: 210},
               %{clan: "c3", name: "u32", place: 13, score: 192},
               %{clan: "c3", name: "u33", place: 14, score: 175},
               %{clan: "c3", name: "u34", place: 15, score: 158},
               %{clan: "c3", name: "u35", place: 16, score: 140},
               %{clan: "c2", name: "u25", place: 17, score: 123},
               %{clan: "c4", name: "u41", place: 18, score: 105},
               %{clan: "c4", name: "u42", place: 19, score: 77},
               %{clan: "c2", name: "u26", place: 20, score: 71},
               %{clan: "c7", name: "u71", place: 21, score: 59},
               %{clan: "c4", name: "u43", place: 22, score: 52},
               %{clan: "c4", name: "u44", place: 23, score: 32},
               %{clan: "c8", name: "u81", place: 24, score: 32},
               %{clan: "c5", name: "u51", place: 25, score: 18},
               %{clan: "c5", name: "u52", place: 26, score: 15},
               %{clan: "c5", name: "u53", place: 27, score: 12},
               %{clan: "c6", name: "u61", place: 28, score: 10},
               %{clan: "c6", name: "u62", place: 29, score: 8}
             ] =
               tournament
               |> TournamentResult.get_user_ranking()
               |> Map.values()
               |> Enum.sort_by(& &1.place)

      assert [
               %{
                 clan_rank: 1,
                 total_duration_sec: 310,
                 total_score: 1105,
                 user_name: "u11",
                 wins_count: 4
               },
               %{
                 clan_rank: 1,
                 total_duration_sec: 332,
                 total_score: 857,
                 user_name: "u12",
                 wins_count: 3
               },
               %{
                 clan_rank: 1,
                 total_duration_sec: 554,
                 total_score: 783,
                 user_name: "u13",
                 wins_count: 3
               },
               %{
                 clan_rank: 1,
                 total_duration_sec: 760,
                 total_score: 692,
                 user_name: "u14",
                 wins_count: 2
               },
               %{
                 clan_rank: 1,
                 total_duration_sec: 800,
                 total_score: 409,
                 user_name: "u15",
                 wins_count: 1
               },
               %{
                 clan_rank: 2,
                 total_duration_sec: 310,
                 total_score: 714,
                 user_name: "u21",
                 wins_count: 0
               },
               %{
                 clan_rank: 2,
                 total_duration_sec: 332,
                 total_score: 572,
                 user_name: "u22",
                 wins_count: 0
               },
               %{
                 clan_rank: 2,
                 total_duration_sec: 554,
                 total_score: 445,
                 user_name: "u23",
                 wins_count: 0
               },
               %{
                 clan_rank: 2,
                 total_duration_sec: 760,
                 total_score: 321,
                 user_name: "u24",
                 wins_count: 0
               },
               %{
                 clan_rank: 2,
                 total_duration_sec: 800,
                 total_score: 123,
                 user_name: "u25",
                 wins_count: 0
               },
               %{
                 clan_rank: 3,
                 total_duration_sec: 180,
                 total_score: 210,
                 user_name: "u31",
                 wins_count: 1
               },
               %{
                 clan_rank: 3,
                 total_duration_sec: 200,
                 total_score: 192,
                 user_name: "u32",
                 wins_count: 1
               },
               %{
                 clan_rank: 3,
                 total_duration_sec: 220,
                 total_score: 175,
                 user_name: "u33",
                 wins_count: 1
               },
               %{
                 clan_rank: 3,
                 total_duration_sec: 240,
                 total_score: 158,
                 user_name: "u34",
                 wins_count: 1
               },
               %{
                 clan_rank: 3,
                 total_duration_sec: 260,
                 total_score: 140,
                 user_name: "u35",
                 wins_count: 1
               },
               %{
                 clan_rank: 4,
                 total_duration_sec: 180,
                 total_score: 105,
                 user_name: "u41",
                 wins_count: 0
               },
               %{
                 clan_rank: 4,
                 total_duration_sec: 200,
                 total_score: 77,
                 user_name: "u42",
                 wins_count: 0
               },
               %{
                 clan_rank: 4,
                 total_duration_sec: 220,
                 total_score: 52,
                 user_name: "u43",
                 wins_count: 0
               },
               %{
                 clan_rank: 4,
                 total_duration_sec: 240,
                 total_score: 32,
                 user_name: "u44",
                 wins_count: 0
               },
               %{
                 clan_rank: 5,
                 total_duration_sec: 290,
                 total_score: 59,
                 user_name: "u71",
                 wins_count: 0
               },
               %{
                 clan_rank: 6,
                 total_duration_sec: 16,
                 total_score: 18,
                 user_name: "u51",
                 wins_count: 1
               },
               %{
                 clan_rank: 6,
                 total_duration_sec: 18,
                 total_score: 15,
                 user_name: "u52",
                 wins_count: 1
               },
               %{
                 clan_rank: 6,
                 total_duration_sec: 20,
                 total_score: 12,
                 user_name: "u53",
                 wins_count: 1
               },
               %{
                 clan_rank: 7,
                 total_duration_sec: 1210,
                 total_score: 32,
                 user_name: "u81",
                 wins_count: 0
               }
             ] = TournamentResult.get_top_users_by_clan_ranking(tournament)

      assert [
               %{
                 level: "medium",
                 max: Decimal.new("260.00"),
                 min: Decimal.new("100.00"),
                 name: "t3",
                 p25: Decimal.new("140.00"),
                 p5: Decimal.new("108.00"),
                 p50: Decimal.new("180.00"),
                 p75: Decimal.new("236.00"),
                 p95: Decimal.new("252.00"),
                 task_id: task3.id,
                 wins_count: 9
               },
               %{
                 level: "hard",
                 max: Decimal.new("1200.00"),
                 min: Decimal.new("100.00"),
                 name: "t4",
                 p25: Decimal.new("300.00"),
                 p5: Decimal.new("130.00"),
                 p50: Decimal.new("600.00"),
                 p75: Decimal.new("1020.00"),
                 p95: Decimal.new("1140.00"),
                 task_id: task4.id,
                 wins_count: 7
               },
               %{
                 level: "easy",
                 max: Decimal.new("20.00"),
                 min: Decimal.new("10.00"),
                 name: "t2",
                 p25: Decimal.new("12.50"),
                 p5: Decimal.new("10.50"),
                 p50: Decimal.new("15.00"),
                 p75: Decimal.new("18.50"),
                 p95: Decimal.new("19.50"),
                 task_id: task2.id,
                 wins_count: 6
               },
               %{
                 level: "elementary",
                 max: Decimal.new("100.00"),
                 min: Decimal.new("100.00"),
                 name: "t1",
                 p25: Decimal.new("100.00"),
                 p5: Decimal.new("100.00"),
                 p50: Decimal.new("100.00"),
                 p75: Decimal.new("100.00"),
                 p95: Decimal.new("100.00"),
                 task_id: task1.id,
                 wins_count: 1
               }
             ] == TournamentResult.get_tasks_ranking(tournament)

      assert [
               %{clan_name: "c1", game_id: _, score: 600, user_id: _, user_name: "u11"},
               %{clan_name: "c1", game_id: _, score: 573, user_id: _, user_name: "u12"},
               %{clan_name: "c1", game_id: _, score: 518, user_id: _, user_name: "u13"},
               %{clan_name: "c1", game_id: _, score: 464, user_id: _, user_name: "u14"},
               %{clan_name: "c1", game_id: _, score: 409, user_id: _, user_name: "u15"},
               %{clan_name: "c1", game_id: _, score: 355, user_id: _, user_name: "u16"},
               %{clan_name: "c1", game_id: _, score: 300, user_id: _, user_name: "u17"}
             ] = TournamentResult.get_top_user_by_task_ranking(tournament, task4.id)

      assert [
               %{user_name: "u11", score: 280, clan_id: _, clan_name: "c1", game_id: _},
               %{user_name: "u12", score: 262, clan_id: _, clan_name: "c1", game_id: _},
               %{user_name: "u13", score: 245, clan_id: _, clan_name: "c1", game_id: _},
               %{user_name: "u14", score: 228, clan_id: _, clan_name: "c1", game_id: _},
               %{user_name: "u31", score: 210, clan_id: _, clan_name: "c3", game_id: _},
               %{user_name: "u32", score: 192, clan_id: _, clan_name: "c3", game_id: _},
               %{user_name: "u33", score: 175, clan_id: _, clan_name: "c3", game_id: _},
               %{user_name: "u34", score: 158, clan_id: _, clan_name: "c3", game_id: _},
               %{
                 user_name: "u35",
                 score: 140,
                 clan_id: _,
                 clan_name: "c3",
                 game_id: _,
                 user_id: _
               }
             ] = TournamentResult.get_top_user_by_task_ranking(tournament, task3.id)

      assert [
               %{user_name: "u11", score: 25, clan_id: _, clan_name: "c1", game_id: _},
               %{user_name: "u12", score: 22, clan_id: _, clan_name: "c1", game_id: _},
               %{user_name: "u13", score: 20, clan_id: _, clan_name: "c1", game_id: _},
               %{user_name: "u51", score: 18, clan_id: _, clan_name: "c5", game_id: _},
               %{user_name: "u52", score: 15, clan_id: _, clan_name: "c5", game_id: _},
               %{user_name: "u53", score: 12, clan_id: _, clan_name: "c5", game_id: _}
             ] = TournamentResult.get_top_user_by_task_ranking(tournament, task2.id)

      assert [
               %{
                 user_name: "u11",
                 user_id: _,
                 score: 200,
                 clan_id: _,
                 clan_name: "c1",
                 game_id: _,
                 clan_long_name: "l1"
               }
             ] = TournamentResult.get_top_user_by_task_ranking(tournament, task1.id)

      assert [%{start: 100, end: 100, wins_count: 0}] ==
               TournamentResult.get_task_duration_distribution(tournament, task1.id)

      assert [
               %{end: 11, start: 10, wins_count: 1},
               %{end: 12, start: 11, wins_count: 0},
               %{end: 13, start: 12, wins_count: 1},
               %{end: 13, start: 13, wins_count: 0},
               %{start: 13, end: 14, wins_count: 0},
               %{start: 14, end: 15, wins_count: 1},
               %{start: 15, end: 15, wins_count: 0},
               %{start: 15, end: 16, wins_count: 0},
               %{start: 16, end: 17, wins_count: 1},
               %{start: 17, end: 17, wins_count: 0},
               %{start: 17, end: 18, wins_count: 0},
               %{start: 18, end: 19, wins_count: 1},
               %{start: 19, end: 19, wins_count: 0},
               %{start: 19, end: 20, wins_count: 0},
               %{start: 20, end: 21, wins_count: 1},
               %{start: 21, end: 21, wins_count: 0}
             ] == TournamentResult.get_task_duration_distribution(tournament, task2.id)

      assert [
               %{end: 111, start: 100, wins_count: 1},
               %{end: 122, start: 111, wins_count: 1},
               %{end: 133, start: 122, wins_count: 0},
               %{end: 143, start: 133, wins_count: 1},
               %{end: 154, start: 143, wins_count: 0},
               %{end: 165, start: 154, wins_count: 1},
               %{end: 175, start: 165, wins_count: 0},
               %{end: 186, start: 175, wins_count: 1},
               %{end: 197, start: 186, wins_count: 0},
               %{end: 207, start: 197, wins_count: 1},
               %{end: 218, start: 207, wins_count: 0},
               %{start: 218, end: 229, wins_count: 1},
               %{start: 229, end: 239, wins_count: 0},
               %{start: 239, end: 250, wins_count: 1},
               %{start: 250, end: 261, wins_count: 1},
               %{start: 261, end: 271, wins_count: 0}
             ] == TournamentResult.get_task_duration_distribution(tournament, task3.id)

      assert [
               %{end: 174, start: 100, wins_count: 1},
               %{end: 247, start: 174, wins_count: 1},
               %{end: 320, start: 247, wins_count: 0},
               %{end: 394, start: 320, wins_count: 0},
               %{end: 467, start: 394, wins_count: 1},
               %{end: 540, start: 467, wins_count: 0},
               %{end: 614, start: 540, wins_count: 1},
               %{end: 687, start: 614, wins_count: 0},
               %{end: 760, start: 687, wins_count: 0},
               %{end: 834, start: 760, wins_count: 1},
               %{start: 834, end: 907, wins_count: 0},
               %{start: 907, end: 980, wins_count: 0},
               %{start: 980, end: 1054, wins_count: 1},
               %{start: 1054, end: 1127, wins_count: 0},
               %{start: 1127, end: 1200, wins_count: 0},
               %{start: 1200, end: 1274, wins_count: 1}
             ] == TournamentResult.get_task_duration_distribution(tournament, task4.id)

      assert [
               %{
                 clan_name: "c1",
                 performance: 643,
                 player_count: 7,
                 radius: 7,
                 total_score: 4501
               },
               %{
                 clan_name: "c2",
                 performance: 374,
                 player_count: 6,
                 radius: 6,
                 total_score: 2246
               },
               %{clan_name: "c3", performance: 175, player_count: 5, radius: 5, total_score: 875},
               %{clan_name: "c4", performance: 66, player_count: 4, radius: 4, total_score: 266},
               %{clan_name: "c7", performance: 59, player_count: 1, radius: 1, total_score: 59},
               %{clan_name: "c5", performance: 15, player_count: 3, radius: 3, total_score: 45},
               %{clan_name: "c8", performance: 32, player_count: 1, radius: 1, total_score: 32},
               %{clan_name: "c6", performance: 9, player_count: 2, radius: 2, total_score: 18}
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
