defmodule Codebattle.Tournament.SeasonTournamentGenerator do
  @moduledoc """
  Generates all tournaments for a given season based on the scheduling and automation documentation.

  Tournament Schedule:
  - Grand Slam: 21st of last season month at 16:00 UTC
  - Masters: 21st of first and second month of season at 16:00 UTC
  - Elite: 7th of every month in season at 16:00 UTC
  - Pro: 14th and 28th of every month in season at 16:00 UTC
  - Challenger: Daily at 16:00 UTC (skipped when higher priority tournaments run)
  - Rookie: Every 3 hours at 0,3,6,9,12,15,18,21 UTC every day

  Priority: grand_slam > masters > elite > pro > challenger > rookie
  """

  alias Codebattle.Season
  alias Codebattle.Tournament

  # Constants
  @tournament_hour 16
  @tournament_minute 0
  @tournament_second 0
  @timezone "Etc/UTC"

  @default_tournament_params %{
    creator_id: nil,
    break_duration_seconds: 10,
    round_timeout_seconds: 300,
    match_timeout_seconds: 300,
    state: "upcoming",
    type: "swiss",
    access_type: "public",
    use_chat: true,
    use_timer: true
  }

  # Grade configurations
  @grade_config %{
    "rookie" => %{players_limit: 8, rounds_limit: 4},
    "challenger" => %{players_limit: 16, rounds_limit: 6},
    "pro" => %{players_limit: 32, rounds_limit: 8},
    "elite" => %{players_limit: 64, rounds_limit: 10},
    "masters" => %{players_limit: 128, rounds_limit: 12},
    "grand_slam" => %{players_limit: 256, rounds_limit: 14}
  }

  # Rookie tournament hours: 0,3,6,9,12,15,18,21 UTC (every 3 hours)
  @rookie_hours [0, 3, 6, 9, 12, 15, 18, 21]

  @doc """
  Generates all tournaments for a given season.

  ## Parameters
    - season_or_id: Either a %Season{} struct or a season ID (integer/string)

  ## Returns
    - List of tournament changesets ready for insertion
  """
  def generate_season_tournaments(season_or_id) do
    season = get_season(season_or_id)
    start_date = season.starts_at
    end_date = season.ends_at

    # Season number for naming (0-3 based on which quarter of the year)
    season_num = get_season_number(start_date)

    # Generate tournaments in priority order: grand_slam > masters > elite > pro > challenger > rookie
    []
    |> add_grand_slam_tournament(start_date, end_date, season_num)
    |> add_masters_tournaments(start_date, end_date, season_num)
    |> add_elite_tournaments(start_date, end_date, season_num)
    |> add_pro_tournaments(start_date, end_date, season_num)
    |> add_challenger_tournaments(start_date, end_date, season_num)
    |> add_rookie_tournaments(start_date, end_date, season_num)
  end

  # Fetch season from DB if ID is provided, otherwise use the season struct
  defp get_season(%Season{} = season), do: season

  defp get_season(season_id) when is_integer(season_id) or is_binary(season_id) do
    Season.get!(season_id)
  end

  # Determine season number based on start date
  # 0: Fall (Sep 21 - Dec 21)
  # 1: Winter (Dec 21 - Mar 21)
  # 2: Spring (Mar 21 - Jun 21)
  # 3: Summer (Jun 21 - Sep 21)
  defp get_season_number(start_date) do
    case {start_date.month, start_date.day} do
      {9, 21} -> 0
      {12, 21} -> 1
      {3, 21} -> 2
      {6, 21} -> 3
      _ -> 0
    end
  end

  # Rookie tournaments - every 3 hours at 0,3,6,9,12,15,18,21 UTC
  defp add_rookie_tournaments(tournaments, start_date, end_date, _season_num) do
    rookie_tournaments =
      start_date
      |> Date.range(end_date)
      |> Enum.flat_map(fn date ->
        Enum.map(@rookie_hours, fn hour ->
          starts_at = DateTime.new!(date, Time.new!(hour, 0, 0), @timezone)

          Tournament.changeset(
            %Tournament{},
            Map.merge(
              %{
                name: "Rookie",
                description: "Rookie tournament - easy tasks, grind-friendly",
                grade: "rookie",
                starts_at: starts_at,
                players_limit: @grade_config["rookie"].players_limit,
                level: "easy",
                task_provider: "level",
                task_strategy: "random",
                rounds_limit: @grade_config["rookie"].rounds_limit
              },
              @default_tournament_params
            )
          )
        end)
      end)

    tournaments ++ rookie_tournaments
  end

  # Challenger tournaments - daily at 16:00 UTC (except when higher priority tournaments run)
  defp add_challenger_tournaments(tournaments, start_date, end_date, _season_num) do
    # Collect all dates where higher priority tournaments run
    higher_priority_dates = get_higher_priority_dates(start_date, end_date, :challenger)

    challenger_tournaments =
      start_date
      |> Date.range(end_date)
      |> Enum.reject(&MapSet.member?(higher_priority_dates, &1))
      |> Enum.map(fn date ->
        starts_at =
          DateTime.new!(
            date,
            Time.new!(@tournament_hour, @tournament_minute, @tournament_second),
            @timezone
          )

        Tournament.changeset(
          %Tournament{},
          Map.merge(
            %{
              name: "Daily Challenger",
              description: "Daily challenger tournament - the backbone of our competitive calendar",
              grade: "challenger",
              starts_at: starts_at,
              players_limit: @grade_config["challenger"].players_limit,
              level: "easy",
              task_provider: "level",
              task_strategy: "random",
              rounds_limit: @grade_config["challenger"].rounds_limit
            },
            @default_tournament_params
          )
        )
      end)

    tournaments ++ challenger_tournaments
  end

  # Pro tournaments - 14th and 28th of every month at 16:00 UTC
  defp add_pro_tournaments(tournaments, start_date, end_date, _season_num) do
    pro_tournaments =
      start_date
      |> get_months_in_range(end_date)
      |> Enum.flat_map(fn {year, month} ->
        [14, 28]
        |> Enum.map(&build_date_safe(year, month, &1))
        |> Enum.reject(&is_nil/1)
        |> Enum.filter(&date_in_range?(&1, start_date, end_date))
      end)
      |> Enum.map(fn date ->
        starts_at =
          DateTime.new!(
            date,
            Time.new!(@tournament_hour, @tournament_minute, @tournament_second),
            @timezone
          )

        Tournament.changeset(
          %Tournament{},
          Map.merge(
            %{
              name: "Biweekly Pro",
              description: "Pro tournament - for skilled competitors",
              grade: "pro",
              starts_at: starts_at,
              players_limit: @grade_config["pro"].players_limit,
              level: "easy",
              task_provider: "level",
              task_strategy: "random",
              rounds_limit: @grade_config["pro"].rounds_limit
            },
            @default_tournament_params
          )
        )
      end)

    tournaments ++ pro_tournaments
  end

  # Elite tournaments - 7th of every month at 16:00 UTC
  defp add_elite_tournaments(tournaments, start_date, end_date, _season_num) do
    elite_tournaments =
      start_date
      |> get_months_in_range(end_date)
      |> Enum.map(fn {year, month} -> build_date_safe(year, month, 7) end)
      |> Enum.reject(&is_nil/1)
      |> Enum.filter(&date_in_range?(&1, start_date, end_date))
      |> Enum.map(fn date ->
        starts_at =
          DateTime.new!(
            date,
            Time.new!(@tournament_hour, @tournament_minute, @tournament_second),
            @timezone
          )

        Tournament.changeset(
          %Tournament{},
          Map.merge(
            %{
              name: "Monthly Elite",
              description: "Elite tournament - for top-tier competitors",
              grade: "elite",
              starts_at: starts_at,
              players_limit: @grade_config["elite"].players_limit,
              level: "medium",
              task_provider: "level",
              task_strategy: "random",
              rounds_limit: @grade_config["elite"].rounds_limit
            },
            @default_tournament_params
          )
        )
      end)

    tournaments ++ elite_tournaments
  end

  # Masters tournaments - 21st of first and second month of season at 16:00 UTC
  defp add_masters_tournaments(tournaments, start_date, end_date, season_num) do
    # Get months, skip the first one if season starts after the 21st
    months = get_months_in_range(start_date, end_date)

    # Filter to only include months where the 21st falls within the season
    valid_months =
      months
      |> Enum.map(fn {year, month} -> {Date.new!(year, month, 21), year, month} end)
      |> Enum.filter(fn {date, _, _} -> date_in_range?(date, start_date, end_date) end)
      |> Enum.take(2)

    masters_tournaments =
      valid_months
      |> Enum.with_index(1)
      |> Enum.map(fn {{date, year, _month}, index} ->
        starts_at =
          DateTime.new!(
            date,
            Time.new!(@tournament_hour, @tournament_minute, @tournament_second),
            @timezone
          )

        task_pack_name = "masters_s#{season_num}_#{year}_#{index}"

        Tournament.changeset(
          %Tournament{},
          Map.merge(
            %{
              name: "Masters",
              description: "Masters tournament - elite competition with curated tasks",
              grade: "masters",
              starts_at: starts_at,
              players_limit: @grade_config["masters"].players_limit,
              level: "hard",
              rounds_limit: @grade_config["masters"].rounds_limit,
              task_provider: "task_pack",
              task_pack_name: task_pack_name,
              task_strategy: "sequential"
            },
            @default_tournament_params
          )
        )
      end)

    tournaments ++ masters_tournaments
  end

  # Grand Slam tournament - 21st of last season month at 16:00 UTC
  defp add_grand_slam_tournament(tournaments, _start_date, end_date, season_num) do
    # The end_date is already the 21st of the last month
    starts_at =
      DateTime.new!(
        end_date,
        Time.new!(@tournament_hour, @tournament_minute, @tournament_second),
        @timezone
      )

    task_pack_name = "grand_slam_s#{season_num}_#{end_date.year}"

    grand_slam =
      Tournament.changeset(
        %Tournament{},
        Map.merge(
          %{
            name: "Grand Slam",
            description: "Season finale - the ultimate championship tournament with the highest stakes",
            grade: "grand_slam",
            starts_at: starts_at,
            players_limit: @grade_config["grand_slam"].players_limit,
            level: "hard",
            task_provider: "task_pack",
            task_pack_name: task_pack_name,
            task_strategy: "sequential",
            rounds_limit: @grade_config["grand_slam"].rounds_limit
          },
          @default_tournament_params
        )
      )

    tournaments ++ [grand_slam]
  end

  # Get all {year, month} tuples that overlap with the date range
  defp get_months_in_range(start_date, end_date) do
    start_month = {start_date.year, start_date.month}
    end_month = {end_date.year, end_date.month}

    start_month
    |> Stream.unfold(fn {year, month} ->
      current = {year, month}

      if compare_year_month(current, end_month) == :gt do
        nil
      else
        next =
          if month == 12 do
            {year + 1, 1}
          else
            {year, month + 1}
          end

        {current, next}
      end
    end)
    |> Enum.to_list()
  end

  defp compare_year_month({y1, m1}, {y2, m2}) do
    cond do
      y1 < y2 -> :lt
      y1 > y2 -> :gt
      m1 < m2 -> :lt
      m1 > m2 -> :gt
      true -> :eq
    end
  end

  # Safely build a date, returning nil if the day doesn't exist in that month
  defp build_date_safe(year, month, day) do
    case Date.new(year, month, day) do
      {:ok, date} -> date
      {:error, _} -> nil
    end
  end

  defp date_in_range?(date, start_date, end_date) do
    Date.compare(date, start_date) != :lt && Date.compare(date, end_date) != :gt
  end

  # Get dates where higher priority tournaments run (for a given grade)
  defp get_higher_priority_dates(start_date, end_date, grade) do
    dates = MapSet.new()

    dates =
      case grade do
        :challenger ->
          # Pro, Elite, Masters, Grand Slam preempt Challenger
          dates
          |> add_pro_dates(start_date, end_date)
          |> add_elite_dates(start_date, end_date)
          |> add_masters_dates(start_date, end_date)
          |> add_grand_slam_date(end_date)

        :pro ->
          # Elite, Masters, Grand Slam preempt Pro
          dates
          |> add_elite_dates(start_date, end_date)
          |> add_masters_dates(start_date, end_date)
          |> add_grand_slam_date(end_date)

        _ ->
          dates
      end

    dates
  end

  defp add_pro_dates(dates, start_date, end_date) do
    start_date
    |> get_months_in_range(end_date)
    |> Enum.flat_map(fn {year, month} ->
      [14, 28]
      |> Enum.map(&build_date_safe(year, month, &1))
      |> Enum.reject(&is_nil/1)
      |> Enum.filter(&date_in_range?(&1, start_date, end_date))
    end)
    |> Enum.reduce(dates, &MapSet.put(&2, &1))
  end

  defp add_elite_dates(dates, start_date, end_date) do
    start_date
    |> get_months_in_range(end_date)
    |> Enum.map(fn {year, month} -> build_date_safe(year, month, 7) end)
    |> Enum.reject(&is_nil/1)
    |> Enum.filter(&date_in_range?(&1, start_date, end_date))
    |> Enum.reduce(dates, &MapSet.put(&2, &1))
  end

  defp add_masters_dates(dates, start_date, end_date) do
    months = get_months_in_range(start_date, end_date)

    # Filter to only include months where the 21st falls within the season
    months
    |> Enum.map(fn {year, month} -> Date.new!(year, month, 21) end)
    |> Enum.filter(&date_in_range?(&1, start_date, end_date))
    |> Enum.take(2)
    |> Enum.reduce(dates, &MapSet.put(&2, &1))
  end

  defp add_grand_slam_date(dates, end_date) do
    MapSet.put(dates, end_date)
  end
end
