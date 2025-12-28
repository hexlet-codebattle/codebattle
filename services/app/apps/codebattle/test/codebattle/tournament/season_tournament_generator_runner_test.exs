defmodule Codebattle.Tournament.SeasonTournamentGeneratorRunnerTest do
  use Codebattle.IntegrationCase

  alias Codebattle.Tournament
  alias Codebattle.Tournament.SeasonTournamentGeneratorRunner

  describe "generate_season_tournaments/3" do
    test "generates all tournament types for a complete season" do
      season = 0
      year = 2025

      SeasonTournamentGeneratorRunner.generate_season(season, year)

      # Should have tournaments for all grades except open
      tournaments = Repo.all(Tournament)
      grades = tournaments |> Enum.map(& &1.grade) |> Enum.uniq() |> Enum.sort()
      expected_grades = ["challenger", "elite", "grand_slam", "masters", "pro", "rookie"]
      assert grades == expected_grades

      # Check that we have the expected counts for each grade
      grade_counts =
        tournaments
        |> Enum.group_by(& &1.grade)
        |> Enum.map(fn {k, v} -> {String.to_atom(k), length(v)} end)

      # Should have many rookie tournaments (hourly except 16:00)
      rookie_count = Keyword.get(grade_counts, :rookie, 0)
      # Approximately 5 hours * ~92 days
      assert rookie_count > 450

      # Generated 658 tournaments:
      #   challenger  : 92 tournaments
      #   elite       : 3 tournaments
      #   grand_slam  : 1 tournaments
      #   masters     : 4 tournaments
      #   pro         : 6 tournaments
      #   rookie      : 552 tournaments

      # Should have daily challenger tournaments
      challenger_count = Keyword.get(grade_counts, :challenger, 0)
      # Approximately 70 days
      assert challenger_count > 70

      # Should have more than 6 pro
      grand_slam_count = Keyword.get(grade_counts, :pro, 0)
      assert grand_slam_count >= 6

      # Should have more than 3 elite
      grand_slam_count = Keyword.get(grade_counts, :elite, 0)
      assert grand_slam_count >= 3

      # Should have exactly 2 masters
      grand_slam_count = Keyword.get(grade_counts, :masters, 0)
      assert grand_slam_count == 2

      # Should have exactly 1 grand slam
      grand_slam_count = Keyword.get(grade_counts, :grand_slam, 0)
      assert grand_slam_count == 1
    end

    test "rookie tournaments have correct configuration" do
      SeasonTournamentGeneratorRunner.generate_season(0, 2024)

      tournaments = Repo.all(Tournament)
      rookie_tournaments = Enum.filter(tournaments, &(&1.grade == "rookie"))

      # Check first rookie tournament
      first_rookie = List.first(rookie_tournaments)
      assert first_rookie.players_limit == 8
      assert first_rookie.level == "easy"
      assert first_rookie.task_provider == "level"
      assert first_rookie.task_strategy == "random"
      assert first_rookie.type == "swiss"
      assert first_rookie.access_type == "public"
      assert first_rookie.name == "Rookie"
    end

    test "challenger tournaments have correct configuration" do
      SeasonTournamentGeneratorRunner.generate_season(0, 2025)

      tournaments = Repo.all(Tournament)
      challenger_tournaments = Enum.filter(tournaments, &(&1.grade == "challenger"))

      # Check first challenger tournament
      first_challenger = List.first(challenger_tournaments)
      assert first_challenger.players_limit == 16
      assert first_challenger.level == "easy"
      assert first_challenger.task_provider == "level"
      assert first_challenger.task_strategy == "random"
      assert String.contains?(first_challenger.name, "Daily Challenger")

      # All challenger tournaments should be at 16:00 UTC
      Enum.each(challenger_tournaments, fn tournament ->
        starts_at = tournament.starts_at
        assert starts_at.hour == 16
        assert starts_at.minute == 0
      end)
    end

    test "pro tournaments have correct configuration" do
      SeasonTournamentGeneratorRunner.generate_season(0, 2024)

      tournaments = Repo.all(Tournament)
      pro_tournaments = Enum.filter(tournaments, &(&1.grade == "pro"))

      # Should have pro tournaments (some may be preempted by higher grades)
      assert length(pro_tournaments) > 0

      # Check first pro tournament
      first_pro = List.first(pro_tournaments)
      assert first_pro.players_limit == 32
      assert first_pro.level == "easy"
      assert first_pro.task_provider == "level"
      assert first_pro.task_strategy == "random"
      assert first_pro.name == "Biweekly Pro"

      # All pro tournaments should be on the 14th or 28th at 16:00 UTC
      Enum.each(pro_tournaments, fn tournament ->
        starts_at = tournament.starts_at
        date = DateTime.to_date(starts_at)
        # Should be on the 14th or 28th of the month
        assert date.day in [14, 28]
        assert starts_at.hour == 16
        assert starts_at.minute == 0
      end)
    end

    test "elite tournaments have correct configuration" do
      SeasonTournamentGeneratorRunner.generate_season(0, 2024)
      tournaments = Repo.all(Tournament)

      elite_tournaments = Enum.filter(tournaments, &(&1.grade == "elite"))

      # Should have some elite tournaments
      assert length(elite_tournaments) > 0

      # Check first elite tournament
      first_elite = List.first(elite_tournaments)
      assert first_elite.players_limit == 64
      assert first_elite.level == "medium"
      assert first_elite.task_provider == "level"
      assert first_elite.task_strategy == "random"
      assert first_elite.name == "Monthly Elite"

      # All elite tournaments should be on the 7th at 16:00 UTC
      Enum.each(elite_tournaments, fn tournament ->
        starts_at = tournament.starts_at
        date = DateTime.to_date(starts_at)
        # Should be on the 7th of the month
        assert date.day == 7
        assert starts_at.hour == 16
        assert starts_at.minute == 0
      end)
    end

    test "masters tournaments have correct configuration" do
      SeasonTournamentGeneratorRunner.generate_season(0, 2024)
      tournaments = Repo.all(Tournament)

      masters_tournaments = Enum.filter(tournaments, &(&1.grade == "masters"))

      # Should have some masters tournaments
      assert length(masters_tournaments) > 0

      # Check first masters tournament
      first_masters = List.first(masters_tournaments)
      assert first_masters.players_limit == 128
      assert first_masters.level == "hard"
      assert first_masters.task_provider == "task_pack"
      assert first_masters.task_strategy == "sequential"
      assert String.contains?(first_masters.name, "Masters")
      assert String.contains?(first_masters.task_pack_name, "masters_s0_2024_")

      # All masters tournaments should be on the 21st at 16:00 UTC
      Enum.each(masters_tournaments, fn tournament ->
        starts_at = tournament.starts_at
        date = DateTime.to_date(starts_at)
        # Should be on the 21st of the month
        assert date.day == 21
        assert starts_at.hour == 16
        assert starts_at.minute == 0
      end)
    end

    test "grand slam tournament has correct configuration" do
      SeasonTournamentGeneratorRunner.generate_season(0, 2024)
      tournaments = Repo.all(Tournament)

      grand_slam_tournaments = Enum.filter(tournaments, &(&1.grade == "grand_slam"))

      # Should have exactly one grand slam
      assert length(grand_slam_tournaments) == 1

      grand_slam = List.first(grand_slam_tournaments)
      assert grand_slam.players_limit == 256
      assert grand_slam.level == "hard"
      assert grand_slam.task_provider == "task_pack"
      assert grand_slam.task_strategy == "sequential"
      assert grand_slam.task_pack_name == "grand_slam_s0_2024"
      assert grand_slam.name == "Grand Slam"

      # Should be on the season end date (Dec 21) at 16:00 UTC
      starts_at = grand_slam.starts_at
      date = DateTime.to_date(starts_at)
      assert date == ~D[2024-12-21]
      assert starts_at.hour == 16
      assert starts_at.minute == 0
    end

    test "rookie tournaments exclude 16:00 UTC time slot" do
      SeasonTournamentGeneratorRunner.generate_season(0, 2024)
      tournaments = Repo.all(Tournament)

      rookie_tournaments = Enum.filter(tournaments, &(&1.grade == "rookie"))

      # No rookie tournament should be at 16:00
      sixteen_hour_rookies =
        Enum.filter(rookie_tournaments, fn tournament ->
          tournament.starts_at.hour == 16
        end)

      assert Enum.empty?(sixteen_hour_rookies)
    end

    test "generates tournaments for different seasons with correct dates" do
      # Test season 1 (Dec 21 - Mar 21)
      SeasonTournamentGeneratorRunner.generate_season(1, 2025)

      season_1_tournaments = Repo.all(Tournament)

      grand_slam_s1 = Enum.find(season_1_tournaments, &(&1.grade == "grand_slam"))
      starts_at = grand_slam_s1.starts_at
      date = DateTime.to_date(starts_at)
      # Next year for season 1
      assert date == ~D[2026-03-21]

      # Test season 2 (Mar 21 - Jun 21)
      Repo.delete_all(Tournament)
      SeasonTournamentGeneratorRunner.generate_season(2, 2026)
      season_2_tournaments = Repo.all(Tournament)

      grand_slam_s2 = Enum.find(season_2_tournaments, &(&1.grade == "grand_slam"))
      starts_at = grand_slam_s2.starts_at
      date = DateTime.to_date(starts_at)
      assert date == ~D[2026-06-21]
    end
  end
end
