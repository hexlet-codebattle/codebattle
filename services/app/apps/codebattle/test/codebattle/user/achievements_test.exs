defmodule Codebattle.User.AchievementsTest do
  use Codebattle.DataCase

  alias Codebattle.Season
  alias Codebattle.SeasonResult
  alias Codebattle.Tournament
  alias Codebattle.Tournament.TournamentUserResult
  alias Codebattle.User.Achievements
  alias Codebattle.UserAchievement

  describe "calc_games_played_milestone/1" do
    test "returns highest reached game milestone" do
      user = insert(:user)
      insert_user_games(user.id, 1_550)

      assert %{"count" => 1500, "label" => "1.5k"} =
               Achievements.calc_games_played_milestone(user.id)
    end

    test "includes bot games" do
      user = insert(:user)
      insert_user_games(user.id, 160, "won", "js", true)

      assert %{"count" => 100, "label" => "100"} = Achievements.calc_games_played_milestone(user.id)
    end
  end

  describe "calc_graded_tournaments_played_milestone/1" do
    test "counts only finished non-open tournaments" do
      user = insert(:user)

      finished_challenger = insert_finished_tournament("challenger")
      finished_pro = insert_finished_tournament("pro")
      _open = insert_finished_tournament("open")
      _upcoming = insert_tournament(%{grade: "elite", state: "upcoming"})

      now = NaiveDateTime.truncate(NaiveDateTime.utc_now(), :second)

      Repo.insert_all(TournamentUserResult, [
        %{tournament_id: finished_challenger.id, user_id: user.id, inserted_at: now},
        %{tournament_id: finished_pro.id, user_id: user.id, inserted_at: now}
      ])

      assert %{"count" => 1, "label" => "1"} =
               Achievements.calc_graded_tournaments_played_milestone(user.id)
    end
  end

  describe "calc_highest_tournament_win_grade/1" do
    test "returns highest grade with place 1" do
      user = insert(:user)
      pro = insert_finished_tournament("pro")
      masters = insert_finished_tournament("masters")

      now = NaiveDateTime.truncate(NaiveDateTime.utc_now(), :second)

      Repo.insert_all(TournamentUserResult, [
        %{tournament_id: pro.id, user_id: user.id, place: 1, inserted_at: now},
        %{tournament_id: masters.id, user_id: user.id, place: 1, inserted_at: now}
      ])

      assert %{"grade" => "masters", "rank" => 5} =
               Achievements.calc_highest_tournament_win_grade(user.id)
    end
  end

  describe "calc_polyglot/1" do
    test "returns unique won languages when count is at least three and includes bot games" do
      user = insert(:user)
      insert_user_games(user.id, 1, "won", "js")
      insert_user_games(user.id, 1, "won", "ruby")
      insert_user_games(user.id, 1, "won", "python", true)
      insert_user_games(user.id, 1, "won", "php")
      insert_user_games(user.id, 1, "lost", "elixir")

      assert %{"count" => 4, "languages" => ["js", "php", "python", "ruby"]} =
               Achievements.calc_polyglot(user.id)
    end
  end

  describe "calc_season_champion_wins/1" do
    test "counts only season place 1 finishes" do
      user = insert(:user)
      another_user = insert(:user)
      season = insert_season()
      now = NaiveDateTime.truncate(NaiveDateTime.utc_now(), :second)

      Repo.insert_all(SeasonResult, [
        %{season_id: season.id, user_id: user.id, place: 1, inserted_at: now},
        %{season_id: season.id, user_id: another_user.id, place: 1, inserted_at: now}
      ])

      assert %{"count" => 1} = Achievements.calc_season_champion_wins(user.id)
    end
  end

  describe "calc_grand_slam_champion_wins/1" do
    test "counts grand slam place 1 finishes" do
      user = insert(:user)
      grand_slam = insert_finished_tournament("grand_slam")
      elite = insert_finished_tournament("elite")
      now = NaiveDateTime.truncate(NaiveDateTime.utc_now(), :second)

      Repo.insert_all(TournamentUserResult, [
        %{tournament_id: grand_slam.id, user_id: user.id, place: 1, inserted_at: now},
        %{tournament_id: elite.id, user_id: user.id, place: 1, inserted_at: now}
      ])

      assert %{"count" => 1} = Achievements.calc_grand_slam_champion_wins(user.id)
    end
  end

  describe "calc_best_win_streak/1" do
    test "returns max consecutive wins" do
      user = insert(:user)

      insert_user_games(user.id, 2, "won")
      insert_user_games(user.id, 1, "lost")
      insert_user_games(user.id, 4, "won")
      insert_user_games(user.id, 1, "gave_up")

      assert %{"count" => 4} = Achievements.calc_best_win_streak(user.id)
    end

    test "includes bot games in streak" do
      user = insert(:user)

      insert_user_games(user.id, 2, "won")
      insert_user_games(user.id, 1, "won", "js", true)
      insert_user_games(user.id, 1, "lost")

      assert %{"count" => 3} = Achievements.calc_best_win_streak(user.id)
    end
  end

  describe "recalculate_user/1" do
    test "upserts by user and type and keeps highest milestone" do
      user = insert(:user)

      insert_user_games(user.id, 12)
      :ok = Achievements.recalculate_user(user.id)

      first =
        Repo.get_by!(
          UserAchievement,
          user_id: user.id,
          type: :games_played_milestone
        )

      assert first.meta["count"] == 10

      insert_user_games(user.id, 1_500)
      :ok = Achievements.recalculate_user(user.id)

      all =
        UserAchievement
        |> where([a], a.user_id == ^user.id and a.type == :games_played_milestone)
        |> Repo.all()

      assert length(all) == 1
      assert hd(all).meta["count"] == 1500
    end

    test "stores polyglot as separate achievement type" do
      user = insert(:user)
      insert_user_games(user.id, 1, "won", "js")
      insert_user_games(user.id, 1, "won", "ruby")
      insert_user_games(user.id, 1, "won", "php")

      :ok = Achievements.recalculate_user(user.id)

      polyglot =
        Repo.get_by!(
          UserAchievement,
          user_id: user.id,
          type: :polyglot
        )

      assert polyglot.meta["count"] == 3
      assert Enum.sort(polyglot.meta["languages"]) == ["js", "php", "ruby"]
    end

    test "stores game_stats and tournaments_stats metrics types" do
      user = insert(:user)
      insert_user_games(user.id, 2, "won")
      insert_user_games(user.id, 1, "lost")
      insert_user_games(user.id, 1, "gave_up")
      insert_user_games(user.id, 1, "won", "js", true)

      now = NaiveDateTime.truncate(NaiveDateTime.utc_now(), :second)
      grand_slam = insert_finished_tournament("grand_slam")
      elite = insert_finished_tournament("elite")

      Repo.insert_all(TournamentUserResult, [
        %{tournament_id: grand_slam.id, user_id: user.id, place: 1, inserted_at: now},
        %{tournament_id: elite.id, user_id: user.id, place: 1, inserted_at: now}
      ])

      :ok = Achievements.recalculate_user(user.id)

      game_stats = Repo.get_by!(UserAchievement, user_id: user.id, type: :game_stats)
      tournaments_stats = Repo.get_by!(UserAchievement, user_id: user.id, type: :tournaments_stats)

      assert game_stats.meta == %{"won" => 3, "lost" => 1, "gave_up" => 1}

      assert tournaments_stats.meta == %{
               "rookie_wins" => 0,
               "challenger_wins" => 0,
               "pro_wins" => 0,
               "elite_wins" => 1,
               "masters_wins" => 0,
               "grand_slam_wins" => 1
             }
    end
  end

  defp insert_user_games(user_id, count, result \\ "won", lang \\ "js", is_bot \\ false) do
    game = insert(:game)
    now = NaiveDateTime.truncate(NaiveDateTime.utc_now(), :second)

    rows =
      Enum.map(1..count, fn _ ->
        %{
          user_id: user_id,
          game_id: game.id,
          result: result,
          lang: lang,
          is_bot: is_bot,
          inserted_at: now,
          updated_at: now
        }
      end)

    Repo.insert_all(Codebattle.UserGame, rows)
  end

  defp insert_tournament(attrs) do
    params = %{
      name: "Tournament #{System.unique_integer([:positive])}",
      description: "test tournament",
      starts_at: DateTime.utc_now(),
      grade: "challenger",
      state: "finished"
    }

    %Tournament{}
    |> Tournament.changeset(Map.merge(params, attrs))
    |> Repo.insert!()
  end

  defp insert_finished_tournament(grade), do: insert_tournament(%{grade: grade, state: "finished"})

  defp insert_season do
    {:ok, season} =
      Season.create(%{
        name: "S#{System.unique_integer([:positive])}",
        year: 2026,
        starts_at: ~D[2026-01-01],
        ends_at: ~D[2026-03-31]
      })

    season
  end
end
