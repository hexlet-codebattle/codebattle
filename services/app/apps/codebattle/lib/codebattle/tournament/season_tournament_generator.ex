defmodule Codebattle.Tournament.SeasonTournamentGenerator do
  @moduledoc """
  Generates all tournaments for a given season based on the seasons and points documentation.

  Handles different tournament grades with their specific schedules, player limits,
  and task provisioning strategies.
  """

  alias Codebattle.Tournament

  # Constants
  @tournament_hour 16
  @tournament_minute 0
  @tournament_second 0
  @timezone "Etc/UTC"

  @default_tournament_params %{
    creator_id: nil,
    round_timeout_seconds: 300,
    match_timeout_seconds: 300,
    state: "upcoming",
    type: "swiss",
    access_type: "public",
    use_chat: true,
    use_timer: true
  }

  # Grade configurations from documentation
  @grade_config %{
    "rookie" => %{players_limit: 8, rounds_limit: 4},
    "challenger" => %{players_limit: 16, rounds_limit: 6},
    "pro" => %{players_limit: 32, rounds_limit: 8},
    "elite" => %{players_limit: 64, rounds_limit: 10},
    "masters" => %{players_limit: 128, rounds_limit: 12},
    "grand_slam" => %{players_limit: 256, rounds_limit: 14}
  }

  # Rookie tournament times: once per 4 hours (except 16:00 UTC)
  # Should be 3 7 11 15 19 23 UTC
  @rookie_hours [3, 7, 11, 15, 19, 23]

  @doc """
  Generates all tournaments for a given season and year.

  ## Parameters
    - season: Integer (0-3) representing the season
    - year: Integer representing the year

  ## Returns
    - List of tournament changesets ready for insertion
  """
  def generate_season_tournaments(season, year) do
    season_dates = get_season_dates(season, year)

    []
    |> add_rookie_tournaments(season_dates, season)
    |> add_challenger_tournaments(season_dates, season)
    |> add_pro_tournaments(season_dates, season, year)
    |> add_elite_tournaments(season_dates, season, year)
    |> add_masters_tournaments(season_dates, season, year)
    |> add_grand_slam_tournament(season_dates, season, year)
  end

  # Season date ranges
  defp get_season_dates(season, year) do
    case season do
      0 -> {Date.new!(year, 9, 21), Date.new!(year, 12, 21)}
      1 -> {Date.new!(year, 12, 21), Date.new!(year + 1, 3, 21)}
      2 -> {Date.new!(year, 3, 21), Date.new!(year, 6, 21)}
      3 -> {Date.new!(year, 6, 21), Date.new!(year, 9, 21)}
    end
  end

  # Rookie tournaments - once per 4 hours at specific times: 3 7 11 15 19 23 UTC
  defp add_rookie_tournaments(tournaments, {start_date, end_date}, season) do
    num =
      case hour do
        3 -> 0
        7 -> 1
        11 -> 2
        15 -> 3
        19 -> 4
        23 -> 5
      end

    rookie_tournaments =
      start_date
      |> generate_daily_tournaments(end_date, fn date ->
        # Generate tournaments at specific hours: 3 7 11 15 19 23 UTC
        Enum.map(@rookie_hours, fn hour ->
          starts_at = DateTime.new!(date, Time.new!(hour, 0, 0), @timezone)

          Tournament.changeset(
            %Tournament{},
            Map.merge(
              %{
                name: "Rookie S:#{season} #{num} #{format_date(date)}",
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
      |> List.flatten()

    tournaments ++ rookie_tournaments
  end

  # Challenger tournaments - daily at 16:00 UTC
  defp add_challenger_tournaments(tournaments, {start_date, end_date}, season) do
    challenger_tournaments =
      start_date
      |> generate_daily_tournaments(end_date, fn date ->
        # Skip if a higher-grade (pro/elite/masters/grand_slam) runs the same day at 16:00
        if has_higher_grade_same_day?(date, season, year_from_date_range(start_date, end_date)) do
          nil
        else
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
                name: "Daily Challenger S:#{season} #{format_date(date)}",
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
        end
      end)
      |> Enum.reject(&is_nil/1)

    tournaments ++ challenger_tournaments
  end

  # Pro tournaments - weekly Tuesday 16:00 UTC
  defp add_pro_tournaments(tournaments, {start_date, end_date}, season, year) do
    # Tuesday = 2
    pro_tournaments =
      start_date
      |> generate_weekly_tournaments(end_date, 2, fn date ->
        # Skip if there's a higher grade tournament this week
        if !has_higher_grade_tournament?(date, season, year) do
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
                name: "Pro Weekly S:#{season} #{format_date(date)}",
                description: "Weekly pro tournament - for skilled competitors",
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
        end
      end)
      |> Enum.reject(&is_nil/1)

    tournaments ++ pro_tournaments
  end

  # Elite tournaments - bi-weekly Wednesday 16:00 UTC
  defp add_elite_tournaments(tournaments, {start_date, end_date}, season, year) do
    # Wednesday = 3
    elite_tournaments =
      start_date
      |> generate_biweekly_tournaments(end_date, 3, fn date ->
        # Skip if there's a masters or grand slam this week
        if !has_masters_or_grand_slam_tournament?(date, season, year) do
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
                name: "Elite S:#{season} #{format_date(date)}",
                description: "Bi-weekly elite tournament - for top-tier competitors",
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
        end
      end)
      |> Enum.reject(&is_nil/1)

    tournaments ++ elite_tournaments
  end

  # Masters tournaments - monthly Thursday 16:00 UTC
  defp add_masters_tournaments(tournaments, {start_date, end_date}, season, year) do
    # Thursday=4
    masters_dates =
      start_date
      |> generate_monthly_dates_within_season(end_date, 4)
      |> Enum.reject(fn date ->
        # Safety: exclude if this week's range contains the Grand Slam day
        week_start = Date.beginning_of_week(date)
        week_end = Date.end_of_week(date)
        has_grand_slam_tournament_in_week?(week_start, week_end, season, year)
      end)

    masters_tournaments =
      masters_dates
      |> Enum.with_index(1)
      |> Enum.map(fn {date, index} ->
        starts_at =
          DateTime.new!(
            date,
            Time.new!(@tournament_hour, @tournament_minute, @tournament_second),
            @timezone
          )

        task_pack_name = "masters_s#{season}_#{year}_#{index}"

        Tournament.changeset(
          %Tournament{},
          Map.merge(
            %{
              name: "Masters S:#{season} #{format_date(date)}",
              description: "Monthly masters tournament - elite competition with curated tasks",
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

  # Grand Slam tournament - season finale on the 21st at 16:00 UTC
  defp add_grand_slam_tournament(tournaments, {_start_date, end_date}, season, year) do
    starts_at =
      DateTime.new!(
        end_date,
        Time.new!(@tournament_hour, @tournament_minute, @tournament_second),
        @timezone
      )

    task_pack_name = "grand_slam_s#{season}_#{year}"

    grand_slam =
      Tournament.changeset(
        %Tournament{},
        Map.merge(
          %{
            name: "Grand Slam Season #{season} #{year}",
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

  # Helper functions for generating tournaments on schedules
  defp generate_daily_tournaments(start_date, end_date, tournament_fn) do
    start_date
    |> Date.range(end_date)
    |> Enum.map(tournament_fn)
    |> List.flatten()
  end

  defp generate_weekly_tournaments(start_date, end_date, target_weekday, tournament_fn) do
    start_date
    |> find_next_weekday(target_weekday)
    |> generate_weekly_dates_until(end_date)
    |> Enum.map(tournament_fn)
  end

  defp generate_biweekly_tournaments(start_date, end_date, target_weekday, tournament_fn) do
    start_date
    |> find_next_weekday(target_weekday)
    |> generate_biweekly_dates_until(end_date)
    |> Enum.map(tournament_fn)
  end

  defp find_next_weekday(date, target_weekday) do
    current_weekday = Date.day_of_week(date)
    days_to_add = rem(target_weekday - current_weekday + 7, 7)
    Date.add(date, days_to_add)
  end

  defp generate_weekly_dates_until(start_date, end_date) do
    start_date
    |> Stream.iterate(&Date.add(&1, 7))
    |> Enum.take_while(&(Date.compare(&1, end_date) != :gt))
  end

  defp generate_biweekly_dates_until(start_date, end_date) do
    start_date
    |> Stream.iterate(&Date.add(&1, 14))
    |> Enum.take_while(&(Date.compare(&1, end_date) != :gt))
  end

  # Move by whole calendar months (returns the 1st of the new month)
  defp add_months(%Date{year: y, month: m}, n) do
    total = y * 12 + (m - 1) + n
    new_y = div(total, 12)
    new_m = rem(total, 12) + 1
    Date.new!(new_y, new_m, 1)
  end

  # One date per full calendar month strictly inside the season,
  # picking the first target_weekday of each included month.
  # Example for Season 0 (Sep 21–Dec 21): includes Oct and Nov only.
  defp generate_monthly_dates_within_season(start_date, end_date, target_weekday) do
    first_full_month = start_date |> Date.beginning_of_month() |> add_months(1)
    # exclude end month
    last_full_month = Date.beginning_of_month(end_date)

    first_full_month
    |> Stream.unfold(fn month_start ->
      if Date.before?(month_start, last_full_month) do
        date = find_next_weekday(month_start, target_weekday)
        next_month = add_months(month_start, 1)
        {date, next_month}
      end
    end)
    |> Enum.to_list()
  end

  defp generate_monthly_dates_until(start_date, end_date) do
    start_date
    |> Stream.iterate(fn date ->
      # Add approximately 4 weeks, then find the next Thursday
      next_approx = Date.add(date, 28)
      find_next_weekday(next_approx, 4)
    end)
    |> Enum.take_while(&(Date.compare(&1, end_date) != :gt))
  end

  # Check if there are higher grade tournaments that preempt others
  defp has_higher_grade_tournament?(date, season, year) do
    week_start = Date.beginning_of_week(date)
    week_end = Date.end_of_week(date)

    has_masters_or_grand_slam_tournament?(date, season, year) ||
      has_elite_tournament_in_week?(week_start, week_end, season, year)
  end

  defp has_masters_or_grand_slam_tournament?(date, season, year) do
    week_start = Date.beginning_of_week(date)
    week_end = Date.end_of_week(date)

    has_masters_tournament_in_week?(week_start, week_end, season, year) ||
      has_grand_slam_tournament_in_week?(week_start, week_end, season, year)
  end

  # True only if an actual bi-weekly Wednesday (elite) falls in [week_start, week_end]
  defp has_elite_tournament_in_week?(week_start, week_end, season, year) do
    {start_date, end_date} = get_season_dates(season, year)
    # Wednesday
    first_elite = find_next_weekday(start_date, 3)

    if Date.after?(first_elite, end_date) do
      false
    else
      # Find the first elite >= week_start
      days_from_first = max(0, Date.diff(week_start, first_elite))
      # Next elite occurrence offset in [0..13]
      offset = rem(14 - rem(days_from_first, 14), 14)
      candidate = Date.add(week_start, offset)

      Date.compare(candidate, week_end) != :gt and
        Date.compare(candidate, end_date) != :gt and
        Date.compare(candidate, first_elite) != :lt
    end
  end

  # True only if a generated monthly Thursday (masters) falls in [week_start, week_end]
  defp has_masters_tournament_in_week?(week_start, week_end, season, year) do
    {start_date, end_date} = get_season_dates(season, year)

    start_date
    # Thursday
    |> find_next_weekday(4)
    |> generate_monthly_dates_until(end_date)
    |> Enum.any?(fn date ->
      Date.compare(date, week_start) != :lt and Date.compare(date, week_end) != :gt
    end)
  end

  defp has_grand_slam_tournament_in_week?(week_start, week_end, season, year) do
    {_start_date, end_date} = get_season_dates(season, year)
    Date.compare(end_date, week_start) != :lt && Date.compare(end_date, week_end) != :gt
  end

  defp format_date(date) do
    Date.to_string(date)
  end

  # --- DEDUP / SCHEDULE PREDICATES ---

  defp grand_slam_day?(date, season, year) do
    {_start_date, end_date} = get_season_dates(season, year)
    date == end_date
  end

  defp will_pro_run_on?(date, season, year) do
    # Pro runs Tuesday 16:00 unless preempted by elite/masters/grand_slam week
    Date.day_of_week(date) == 2 and not has_higher_grade_tournament?(date, season, year)
  end

  defp will_elite_run_on?(date, season, year) do
    # Elite is bi-weekly Wednesday 16:00, skipped if masters/grand_slam in that week
    if Date.day_of_week(date) == 3 do
      {start_date, end_date} = get_season_dates(season, year)
      # first Wed >= season start
      first_elite = find_next_weekday(start_date, 3)

      if Date.after?(first_elite, end_date) do
        false
      else
        # Check bi-weekly cadence
        days_from_first = Date.diff(date, first_elite)
        biweekly? = days_from_first >= 0 and rem(days_from_first, 14) == 0
        biweekly? and not has_masters_or_grand_slam_tournament?(date, season, year)
      end
    else
      false
    end
  end

  defp will_masters_run_on?(date, season, year) do
    {start_date, end_date} = get_season_dates(season, year)

    # If you adopted the month-aware generator from the previous message, keep this in sync.
    # Otherwise this approximates your current monthly Thursday logic and then filters GS week.
    monthly_dates =
      start_date
      # first Thu >= season start
      |> find_next_weekday(4)
      |> generate_monthly_dates_until(end_date)

    in_monthly_list? = Enum.any?(monthly_dates, &(&1 == date))

    if in_monthly_list? do
      week_start = Date.beginning_of_week(date)
      week_end = Date.end_of_week(date)
      not has_grand_slam_tournament_in_week?(week_start, week_end, season, year)
    else
      false
    end
  end

  defp has_higher_grade_same_day?(date, season, year) do
    grand_slam_day?(date, season, year) or
      will_masters_run_on?(date, season, year) or
      will_elite_run_on?(date, season, year) or
      will_pro_run_on?(date, season, year)
  end

  defp year_from_date_range(start_date, _end_date), do: start_date.year
end
