defmodule Codebattle.Tournament.TournamenResultTest do
  use Codebattle.DataCase, async: false

  alias Codebattle.Tournament.TournamentResult

  describe "get_player_results" do
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

      tournament = insert(:tournament, type: "swiss", ranking_type: "by_percentile", use_clan: false)

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
               %{id: _, name: "u11", score: 500, clan: "c1", clan_id: _, place: 1},
               %{id: _, name: "u12", score: 419, clan: "c1", clan_id: _, place: 2},
               %{id: _, name: "u21", score: 370, clan: "c2", clan_id: _, place: 3},
               %{id: _, name: "u13", score: 363, clan: "c1", clan_id: _, place: 4},
               %{id: _, name: "u22", score: 298, clan: "c2", clan_id: _, place: 5},
               %{id: _, name: "u14", score: 247, clan: "c1", clan_id: _, place: 6},
               %{id: _, name: "u23", score: 221, clan: "c2", clan_id: _, place: 7},
               %{id: _, name: "u24", score: 121, clan: "c2", clan_id: _, place: 8},
               %{id: _, name: "u15", score: 107, clan: "c1", clan_id: _, place: 9},
               %{id: _, name: "u31", score: 98, clan: "c3", clan_id: _, place: 10},
               %{id: _, name: "u32", score: 83, clan: "c3", clan_id: _, place: 11},
               %{id: _, name: "u16", score: 79, clan: "c1", clan_id: _, place: 12},
               %{id: _, name: "u33", score: 68, clan: "c3", clan_id: _, place: 13},
               %{id: _, name: "u17", score: 60, clan: "c1", clan_id: _, place: 14},
               %{id: _, name: "u51", score: 57, clan: "c5", clan_id: _, place: 15},
               %{id: _, name: "u71", score: 56, clan: "c7", clan_id: _, place: 16},
               %{id: _, name: "u34", score: 54, clan: "c3", clan_id: _, place: 17},
               %{id: _, name: "u41", score: 49, clan: "c4", clan_id: _, place: 18},
               %{id: _, name: "u35", score: 45, clan: "c3", clan_id: _, place: 19},
               %{id: _, name: "u52", score: 42, clan: "c5", clan_id: _, place: 20},
               %{id: _, name: "u61", score: 34, clan: "c6", clan_id: _, place: 21},
               %{id: _, name: "u42", score: 33, clan: "c4", clan_id: _, place: 22},
               %{id: _, name: "u25", score: 32, clan: "c2", clan_id: _, place: 23},
               %{id: _, name: "u53", score: 30, clan: "c5", clan_id: _, place: 24},
               %{id: _, name: "u62", score: 21, clan: "c6", clan_id: _, place: 25},
               %{id: _, name: "u43", score: 20, clan: "c4", clan_id: _, place: 26},
               %{id: _, name: "u26", score: 16, clan: "c2", clan_id: _, place: 27},
               %{id: _, name: "u44", score: 11, clan: "c4", clan_id: _, place: 28},
               %{id: _, name: "u81", score: 8, clan: "c8", clan_id: _, place: 29}
             ] = TournamentResult.get_user_ranking(tournament)

      assert [
               %{clan_rank: 1, total_duration_sec: 310, total_score: 500, user_name: "u11", wins_count: 4},
               %{clan_rank: 1, total_duration_sec: 332, total_score: 419, user_name: "u12", wins_count: 3},
               %{clan_rank: 1, total_duration_sec: 554, total_score: 363, user_name: "u13", wins_count: 3},
               %{clan_rank: 1, total_duration_sec: 760, total_score: 247, user_name: "u14", wins_count: 2},
               %{clan_rank: 1, total_duration_sec: 800, total_score: 107, user_name: "u15", wins_count: 1},
               %{clan_rank: 2, total_duration_sec: 310, total_score: 370, user_name: "u21", wins_count: 0},
               %{clan_rank: 2, total_duration_sec: 332, total_score: 298, user_name: "u22", wins_count: 0},
               %{clan_rank: 2, total_duration_sec: 554, total_score: 221, user_name: "u23", wins_count: 0},
               %{clan_rank: 2, total_duration_sec: 760, total_score: 121, user_name: "u24", wins_count: 0},
               %{clan_rank: 2, total_duration_sec: 800, total_score: 32, user_name: "u25", wins_count: 0},
               %{clan_rank: 3, total_duration_sec: 180, total_score: 98, user_name: "u31", wins_count: 1},
               %{clan_rank: 3, total_duration_sec: 200, total_score: 83, user_name: "u32", wins_count: 1},
               %{clan_rank: 3, total_duration_sec: 220, total_score: 68, user_name: "u33", wins_count: 1},
               %{clan_rank: 3, total_duration_sec: 240, total_score: 54, user_name: "u34", wins_count: 1},
               %{clan_rank: 3, total_duration_sec: 260, total_score: 45, user_name: "u35", wins_count: 1},
               %{clan_rank: 4, total_duration_sec: 16, total_score: 57, user_name: "u51", wins_count: 1},
               %{clan_rank: 4, total_duration_sec: 18, total_score: 42, user_name: "u52", wins_count: 1},
               %{clan_rank: 4, total_duration_sec: 20, total_score: 30, user_name: "u53", wins_count: 1},
               %{clan_rank: 5, total_duration_sec: 180, total_score: 49, user_name: "u41", wins_count: 0},
               %{clan_rank: 5, total_duration_sec: 200, total_score: 33, user_name: "u42", wins_count: 0},
               %{clan_rank: 5, total_duration_sec: 220, total_score: 20, user_name: "u43", wins_count: 0},
               %{clan_rank: 5, total_duration_sec: 240, total_score: 11, user_name: "u44", wins_count: 0},
               %{clan_rank: 6, total_duration_sec: 290, total_score: 56, user_name: "u71", wins_count: 0},
               %{clan_rank: 7, total_duration_sec: 16, total_score: 34, user_name: "u61", wins_count: 0},
               %{clan_rank: 7, total_duration_sec: 18, total_score: 21, user_name: "u62", wins_count: 0}
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
               %{clan_name: "c1", game_id: _, score: 200, user_id: _, user_name: "u11"},
               %{clan_name: "c1", game_id: _, score: 190, user_id: _, user_name: "u12"},
               %{clan_name: "c1", game_id: _, score: 163, user_id: _, user_name: "u13"},
               %{clan_name: "c1", game_id: _, score: 135, user_id: _, user_name: "u14"},
               %{clan_name: "c1", game_id: _, score: 107, user_id: _, user_name: "u15"},
               %{clan_name: "c1", game_id: _, score: 79, user_id: _, user_name: "u16"},
               %{clan_name: "c1", game_id: _, score: 60, user_id: _, user_name: "u17"}
             ] = TournamentResult.get_top_user_by_task_ranking(tournament, task4.id)

      assert [
               %{user_name: "u11", score: 150, clan_id: _, clan_name: "c1", game_id: _},
               %{user_name: "u12", score: 141, clan_id: _, clan_name: "c1", game_id: _},
               %{user_name: "u13", score: 127, clan_id: _, clan_name: "c1", game_id: _},
               %{user_name: "u14", score: 112, clan_id: _, clan_name: "c1", game_id: _},
               %{user_name: "u31", score: 98, clan_id: _, clan_name: "c3", game_id: _},
               %{user_name: "u32", score: 83, clan_id: _, clan_name: "c3", game_id: _},
               %{user_name: "u33", score: 68, clan_id: _, clan_name: "c3", game_id: _},
               %{user_name: "u34", score: 54, clan_id: _, clan_name: "c3", game_id: _},
               %{user_name: "u35", user_id: _, score: 45, clan_id: _, clan_name: "c3", game_id: _}
             ] = TournamentResult.get_top_user_by_task_ranking(tournament, task3.id)

      assert [
               %{user_name: "u11", score: 100, clan_id: _, clan_name: "c1", game_id: _},
               %{user_name: "u12", score: 88, clan_id: _, clan_name: "c1", game_id: _},
               %{user_name: "u13", score: 73, clan_id: _, clan_name: "c1", game_id: _},
               %{user_name: "u51", score: 57, clan_id: _, clan_name: "c5", game_id: _},
               %{user_name: "u52", score: 42, clan_id: _, clan_name: "c5", game_id: _},
               %{user_name: "u53", score: 30, clan_id: _, clan_name: "c5", game_id: _}
             ] = TournamentResult.get_top_user_by_task_ranking(tournament, task2.id)

      assert [
               %{user_name: "u11", user_id: _, score: 50, clan_id: _, clan_name: "c1", game_id: _, clan_long_name: "l1"}
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
               %{clan_name: "c1", performance: 253, player_count: 7, radius: 7, total_score: 1775},
               %{clan_name: "c2", performance: 176, player_count: 6, radius: 6, total_score: 1058},
               %{clan_name: "c3", performance: 69, player_count: 5, radius: 5, total_score: 348},
               %{clan_name: "c5", performance: 43, player_count: 3, radius: 3, total_score: 129},
               %{radius: 4, total_score: 113, clan_name: "c4", performance: 28, player_count: 4},
               %{radius: 1, total_score: 56, clan_name: "c7", performance: 56, player_count: 1},
               %{clan_name: "c6", performance: 27, player_count: 2, radius: 2, total_score: 55},
               %{clan_name: "c8", performance: 8, player_count: 1, radius: 1, total_score: 8}
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
