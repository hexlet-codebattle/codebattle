defmodule Codebattle.Tournament.SeasonTournamentGeneratorTest do
  use Codebattle.DataCase

  alias Codebattle.Season
  alias Codebattle.Tournament.SeasonTournamentGenerator

  describe "generate_season_tournaments/1" do
    test "generates tournaments from a Season struct" do
      season = %Season{
        id: 1,
        name: "Fall 2024",
        year: 2024,
        starts_at: ~D[2024-09-21],
        ends_at: ~D[2024-12-21]
      }

      tournaments = SeasonTournamentGenerator.generate_season_tournaments(season)

      assert length(tournaments) > 0

      # Verify all tournaments are changesets
      Enum.each(tournaments, fn tournament ->
        assert %Ecto.Changeset{} = tournament
      end)
    end

    test "generates correct tournament counts for Fall 2024 season" do
      season = %Season{
        id: 1,
        name: "Fall 2024",
        year: 2024,
        starts_at: ~D[2024-09-21],
        ends_at: ~D[2024-12-21]
      }

      tournaments = SeasonTournamentGenerator.generate_season_tournaments(season)

      # Extract grades from changesets
      grades =
        tournaments
        |> Enum.map(fn changeset -> Ecto.Changeset.get_field(changeset, :grade) end)
        |> Enum.frequencies()

      # Grand Slam: 1 (Dec 21 at 16:00)
      assert grades["grand_slam"] == 1

      # Masters: 2 (Sep 21 and Oct 21 at 16:00)
      assert grades["masters"] == 2

      # Elite: 3 (Oct 7, Nov 7, Dec 7 at 16:00)
      assert grades["elite"] == 3

      # Pro: 6 (Sep 28, Oct 14, Oct 28, Nov 14, Nov 28, Dec 14 at 16:00)
      assert grades["pro"] == 6

      # Challenger: Daily at 16:00 except when higher priority tournaments run
      # Sep 21-Dec 21 = 92 days
      # Minus: 1 grand_slam + 2 masters + 3 elite + 6 pro = 12
      # = 80 challenger tournaments
      assert grades["challenger"] == 80

      # Rookie: Every 3 hours at 0,3,6,9,12,15,18,21 (8 times per day)
      # 92 days * 8 = 736 rookie tournaments
      assert grades["rookie"] == 736
    end

    test "Grand Slam tournament is scheduled on last day of season" do
      season = %Season{
        id: 1,
        name: "Fall 2024",
        year: 2024,
        starts_at: ~D[2024-09-21],
        ends_at: ~D[2024-12-21]
      }

      tournaments = SeasonTournamentGenerator.generate_season_tournaments(season)

      grand_slams =
        Enum.filter(tournaments, fn changeset ->
          Ecto.Changeset.get_field(changeset, :grade) == "grand_slam"
        end)

      assert length(grand_slams) == 1
      grand_slam = List.first(grand_slams)

      starts_at = Ecto.Changeset.get_field(grand_slam, :starts_at)
      assert DateTime.to_date(starts_at) == ~D[2024-12-21]
      assert starts_at.hour == 16
      assert starts_at.minute == 0

      name = Ecto.Changeset.get_field(grand_slam, :name)
      assert name == "Grand Slam Season 0 2024"

      task_pack_name = Ecto.Changeset.get_field(grand_slam, :task_pack_name)
      assert task_pack_name == "grand_slam_s0_2024"

      assert Ecto.Changeset.get_field(grand_slam, :players_limit) == 256
      assert Ecto.Changeset.get_field(grand_slam, :rounds_limit) == 14
      assert Ecto.Changeset.get_field(grand_slam, :level) == "hard"
      assert Ecto.Changeset.get_field(grand_slam, :task_provider) == "task_pack"
      assert Ecto.Changeset.get_field(grand_slam, :task_strategy) == "sequential"
    end

    test "Masters tournaments are scheduled on 21st of first two months" do
      season = %Season{
        id: 1,
        name: "Fall 2024",
        year: 2024,
        starts_at: ~D[2024-09-21],
        ends_at: ~D[2024-12-21]
      }

      tournaments = SeasonTournamentGenerator.generate_season_tournaments(season)

      masters =
        Enum.filter(tournaments, fn changeset ->
          Ecto.Changeset.get_field(changeset, :grade) == "masters"
        end)

      assert length(masters) == 2

      # Check dates - first two months where 21st falls in the season
      # Sep 21 (start of season) and Oct 21
      dates =
        masters
        |> Enum.map(fn changeset ->
          changeset |> Ecto.Changeset.get_field(:starts_at) |> DateTime.to_date()
        end)
        |> Enum.sort(Date)

      # Checking: Sep 21 is the start date, so it's valid. Oct 21 is the second month.
      assert dates == [~D[2024-09-21], ~D[2024-10-21]]

      # Check all are at 16:00 UTC
      Enum.each(masters, fn changeset ->
        starts_at = Ecto.Changeset.get_field(changeset, :starts_at)
        assert starts_at.hour == 16
        assert starts_at.minute == 0
      end)

      # Check configuration
      first_masters = List.first(masters)
      assert Ecto.Changeset.get_field(first_masters, :players_limit) == 128
      assert Ecto.Changeset.get_field(first_masters, :rounds_limit) == 12
      assert Ecto.Changeset.get_field(first_masters, :level) == "hard"
      assert Ecto.Changeset.get_field(first_masters, :task_provider) == "task_pack"
      assert Ecto.Changeset.get_field(first_masters, :task_strategy) == "sequential"
    end

    test "Elite tournaments are scheduled on 7th of every month" do
      season = %Season{
        id: 1,
        name: "Fall 2024",
        year: 2024,
        starts_at: ~D[2024-09-21],
        ends_at: ~D[2024-12-21]
      }

      tournaments = SeasonTournamentGenerator.generate_season_tournaments(season)

      elite =
        Enum.filter(tournaments, fn changeset ->
          Ecto.Changeset.get_field(changeset, :grade) == "elite"
        end)

      # Sep (no 7th, season starts 21st), Oct 7, Nov 7, Dec 7 = 3 tournaments
      assert length(elite) == 3

      dates =
        elite
        |> Enum.map(fn changeset ->
          changeset |> Ecto.Changeset.get_field(:starts_at) |> DateTime.to_date()
        end)
        |> Enum.sort(Date)

      assert dates == [~D[2024-10-07], ~D[2024-11-07], ~D[2024-12-07]]

      # Check all are at 16:00 UTC
      Enum.each(elite, fn changeset ->
        starts_at = Ecto.Changeset.get_field(changeset, :starts_at)
        assert starts_at.hour == 16
        assert starts_at.minute == 0
      end)

      # Check configuration
      first_elite = List.first(elite)
      assert Ecto.Changeset.get_field(first_elite, :players_limit) == 64
      assert Ecto.Changeset.get_field(first_elite, :rounds_limit) == 10
      assert Ecto.Changeset.get_field(first_elite, :level) == "medium"
      assert Ecto.Changeset.get_field(first_elite, :task_provider) == "level"
      assert Ecto.Changeset.get_field(first_elite, :task_strategy) == "random"
    end

    test "Pro tournaments are scheduled on 14th and 28th of every month" do
      season = %Season{
        id: 1,
        name: "Fall 2024",
        year: 2024,
        starts_at: ~D[2024-09-21],
        ends_at: ~D[2024-12-21]
      }

      tournaments = SeasonTournamentGenerator.generate_season_tournaments(season)

      pro =
        Enum.filter(tournaments, fn changeset ->
          Ecto.Changeset.get_field(changeset, :grade) == "pro"
        end)

      # Sep 28, Oct 14, Oct 28, Nov 14, Nov 28, Dec 14 = 6 tournaments
      assert length(pro) == 6

      dates =
        pro
        |> Enum.map(fn changeset ->
          changeset |> Ecto.Changeset.get_field(:starts_at) |> DateTime.to_date()
        end)
        |> Enum.sort(Date)

      assert dates == [
               ~D[2024-09-28],
               ~D[2024-10-14],
               ~D[2024-10-28],
               ~D[2024-11-14],
               ~D[2024-11-28],
               ~D[2024-12-14]
             ]

      # Check all are at 16:00 UTC
      Enum.each(pro, fn changeset ->
        starts_at = Ecto.Changeset.get_field(changeset, :starts_at)
        assert starts_at.hour == 16
        assert starts_at.minute == 0
      end)

      # Check configuration
      first_pro = List.first(pro)
      assert Ecto.Changeset.get_field(first_pro, :players_limit) == 32
      assert Ecto.Changeset.get_field(first_pro, :rounds_limit) == 8
      assert Ecto.Changeset.get_field(first_pro, :level) == "easy"
      assert Ecto.Changeset.get_field(first_pro, :task_provider) == "level"
      assert Ecto.Changeset.get_field(first_pro, :task_strategy) == "random"
    end

    test "Challenger tournaments are daily at 16:00 except when higher priority runs" do
      season = %Season{
        id: 1,
        name: "Fall 2024",
        year: 2024,
        starts_at: ~D[2024-09-21],
        ends_at: ~D[2024-12-21]
      }

      tournaments = SeasonTournamentGenerator.generate_season_tournaments(season)

      challenger =
        Enum.filter(tournaments, fn changeset ->
          Ecto.Changeset.get_field(changeset, :grade) == "challenger"
        end)

      # 92 days - (1 grand_slam + 2 masters + 3 elite + 6 pro) = 80
      assert length(challenger) == 80

      # Check all are at 16:00 UTC
      Enum.each(challenger, fn changeset ->
        starts_at = Ecto.Changeset.get_field(changeset, :starts_at)
        assert starts_at.hour == 16
        assert starts_at.minute == 0
      end)

      # Check that no challenger runs on higher priority tournament dates
      challenger_dates =
        MapSet.new(challenger, fn changeset ->
          changeset |> Ecto.Changeset.get_field(:starts_at) |> DateTime.to_date()
        end)

      # Grand Slam date
      refute MapSet.member?(challenger_dates, ~D[2024-12-21])

      # Masters dates (Sep 21 and Oct 21)
      refute MapSet.member?(challenger_dates, ~D[2024-09-21])
      refute MapSet.member?(challenger_dates, ~D[2024-10-21])

      # Elite dates
      refute MapSet.member?(challenger_dates, ~D[2024-10-07])
      refute MapSet.member?(challenger_dates, ~D[2024-11-07])
      refute MapSet.member?(challenger_dates, ~D[2024-12-07])

      # Pro dates
      refute MapSet.member?(challenger_dates, ~D[2024-09-28])
      refute MapSet.member?(challenger_dates, ~D[2024-10-14])
      refute MapSet.member?(challenger_dates, ~D[2024-10-28])

      # Check configuration
      first_challenger = List.first(challenger)
      assert Ecto.Changeset.get_field(first_challenger, :players_limit) == 16
      assert Ecto.Changeset.get_field(first_challenger, :rounds_limit) == 6
      assert Ecto.Changeset.get_field(first_challenger, :level) == "easy"
      assert Ecto.Changeset.get_field(first_challenger, :task_provider) == "level"
      assert Ecto.Changeset.get_field(first_challenger, :task_strategy) == "random"
    end

    test "Rookie tournaments run every 3 hours at 0,3,6,9,12,15,18,21" do
      season = %Season{
        id: 1,
        name: "Fall 2024",
        year: 2024,
        starts_at: ~D[2024-09-21],
        ends_at: ~D[2024-12-21]
      }

      tournaments = SeasonTournamentGenerator.generate_season_tournaments(season)

      rookie =
        Enum.filter(tournaments, fn changeset ->
          Ecto.Changeset.get_field(changeset, :grade) == "rookie"
        end)

      # 92 days * 8 times per day = 736
      assert length(rookie) == 736

      # Check that all rookie tournaments are at the correct hours
      hours =
        rookie
        |> Enum.map(fn changeset ->
          Ecto.Changeset.get_field(changeset, :starts_at).hour
        end)
        |> Enum.uniq()
        |> Enum.sort()

      assert hours == [0, 3, 6, 9, 12, 15, 18, 21]

      # Check that no rookie runs at 16:00 (reserved for higher priority)
      sixteen_hour_rookies =
        Enum.filter(rookie, fn changeset ->
          Ecto.Changeset.get_field(changeset, :starts_at).hour == 16
        end)

      assert Enum.empty?(sixteen_hour_rookies)

      # Check configuration
      first_rookie = List.first(rookie)
      assert Ecto.Changeset.get_field(first_rookie, :players_limit) == 8
      assert Ecto.Changeset.get_field(first_rookie, :rounds_limit) == 4
      assert Ecto.Changeset.get_field(first_rookie, :level) == "easy"
      assert Ecto.Changeset.get_field(first_rookie, :task_provider) == "level"
      assert Ecto.Changeset.get_field(first_rookie, :task_strategy) == "random"
    end

    test "generates correct season numbers for different periods" do
      # Fall (Sep 21 - Dec 21) = Season 0
      fall_season = %Season{
        id: 1,
        name: "Fall 2024",
        year: 2024,
        starts_at: ~D[2024-09-21],
        ends_at: ~D[2024-12-21]
      }

      tournaments = SeasonTournamentGenerator.generate_season_tournaments(fall_season)

      grand_slam =
        Enum.find(tournaments, fn changeset ->
          Ecto.Changeset.get_field(changeset, :grade) == "grand_slam"
        end)

      name = Ecto.Changeset.get_field(grand_slam, :name)
      assert String.contains?(name, "Season 0")

      # Winter (Dec 21 - Mar 21) = Season 1
      winter_season = %Season{
        id: 2,
        name: "Winter 2024-2025",
        year: 2024,
        starts_at: ~D[2024-12-21],
        ends_at: ~D[2025-03-21]
      }

      tournaments = SeasonTournamentGenerator.generate_season_tournaments(winter_season)

      grand_slam =
        Enum.find(tournaments, fn changeset ->
          Ecto.Changeset.get_field(changeset, :grade) == "grand_slam"
        end)

      name = Ecto.Changeset.get_field(grand_slam, :name)
      assert String.contains?(name, "Season 1")

      # Spring (Mar 21 - Jun 21) = Season 2
      spring_season = %Season{
        id: 3,
        name: "Spring 2025",
        year: 2025,
        starts_at: ~D[2025-03-21],
        ends_at: ~D[2025-06-21]
      }

      tournaments = SeasonTournamentGenerator.generate_season_tournaments(spring_season)

      grand_slam =
        Enum.find(tournaments, fn changeset ->
          Ecto.Changeset.get_field(changeset, :grade) == "grand_slam"
        end)

      name = Ecto.Changeset.get_field(grand_slam, :name)
      assert String.contains?(name, "Season 2")

      # Summer (Jun 21 - Sep 21) = Season 3
      summer_season = %Season{
        id: 4,
        name: "Summer 2025",
        year: 2025,
        starts_at: ~D[2025-06-21],
        ends_at: ~D[2025-09-21]
      }

      tournaments = SeasonTournamentGenerator.generate_season_tournaments(summer_season)

      grand_slam =
        Enum.find(tournaments, fn changeset ->
          Ecto.Changeset.get_field(changeset, :grade) == "grand_slam"
        end)

      name = Ecto.Changeset.get_field(grand_slam, :name)
      assert String.contains?(name, "Season 3")
    end

    test "handles February correctly for Pro tournaments" do
      # Winter season includes February
      winter_season = %Season{
        id: 2,
        name: "Winter 2024-2025",
        year: 2024,
        starts_at: ~D[2024-12-21],
        ends_at: ~D[2025-03-21]
      }

      tournaments = SeasonTournamentGenerator.generate_season_tournaments(winter_season)

      pro =
        Enum.filter(tournaments, fn changeset ->
          Ecto.Changeset.get_field(changeset, :grade) == "pro"
        end)

      # Get February pro tournaments
      feb_pros =
        Enum.filter(pro, fn changeset ->
          date = changeset |> Ecto.Changeset.get_field(:starts_at) |> DateTime.to_date()
          date.month == 2
        end)

      # Should have Feb 14 and Feb 28 (2025 is not a leap year, has 28 days)
      assert length(feb_pros) == 2

      feb_dates =
        feb_pros
        |> Enum.map(fn changeset ->
          changeset |> Ecto.Changeset.get_field(:starts_at) |> DateTime.to_date()
        end)
        |> Enum.sort(Date)

      assert feb_dates == [~D[2025-02-14], ~D[2025-02-28]]
    end

    test "all tournaments have required default parameters" do
      season = %Season{
        id: 1,
        name: "Fall 2024",
        year: 2024,
        starts_at: ~D[2024-09-21],
        ends_at: ~D[2024-12-21]
      }

      tournaments = SeasonTournamentGenerator.generate_season_tournaments(season)

      # Check a sample of each type
      Enum.each(tournaments, fn changeset ->
        assert Ecto.Changeset.get_field(changeset, :state) == "upcoming"
        assert Ecto.Changeset.get_field(changeset, :type) == "swiss"
        assert Ecto.Changeset.get_field(changeset, :access_type) == "public"
        assert Ecto.Changeset.get_field(changeset, :use_chat) == true
        assert Ecto.Changeset.get_field(changeset, :use_timer) == true
        assert Ecto.Changeset.get_field(changeset, :round_timeout_seconds) == 300
        assert Ecto.Changeset.get_field(changeset, :match_timeout_seconds) == 300
      end)
    end
  end
end
