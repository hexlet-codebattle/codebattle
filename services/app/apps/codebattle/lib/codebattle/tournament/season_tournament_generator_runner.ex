defmodule Codebattle.Tournament.SeasonTournamentGeneratorRunner do
  @moduledoc """
  Runner for the SeasonTournamentGenerator module.

  This module inserts into the database all tournaments generated
  from the SeasonTournamentGenerator module.
  """

  alias Codebattle.Repo
  alias Codebattle.Season
  alias Codebattle.Tournament.SeasonTournamentGenerator

  require Logger

  @doc """
  Generate and insert all tournaments for a given season.
  Can accept a season_id or create a temporary season struct from season/year.
  """
  def generate_season(season_or_id, year \\ nil) do
    # Get or create season struct
    season_struct =
      case {season_or_id, year} do
        {%Season{} = season, _} ->
          season

        {season_id, nil} when is_integer(season_id) or is_binary(season_id) ->
          Season.get!(season_id)

        {season_num, year} when is_integer(season_num) and is_integer(year) ->
          # Create temporary season struct for backward compatibility
          {start_date, end_date} = get_season_dates(season_num, year)

          %Season{
            name: "Season #{season_num} #{year}",
            year: year,
            starts_at: start_date,
            ends_at: end_date
          }
      end

    # Generate all tournament changesets
    Logger.info("Generating tournaments for #{season_struct.name}...")
    tournaments = SeasonTournamentGenerator.generate_season_tournaments(season_struct)

    Logger.info("Generated #{length(tournaments)} tournaments:")
    print_tournament_summary(tournaments)

    # Insert all tournaments into the database
    Logger.info("\nInserting tournaments into database...")

    {success_count, failed_count} =
      Enum.reduce(tournaments, {0, 0}, fn changeset, {success, failed} ->
        case Repo.insert(changeset) do
          {:ok, _tournament} -> {success + 1, failed}
          {:error, _changeset} -> {success, failed + 1}
        end
      end)

    Logger.info("Successfully inserted: #{success_count}")
    Logger.info("Failed to insert: #{failed_count}")

    {:ok, success_count, failed_count}
  end

  @doc """
  Generate tournaments for all 4 seasons of a given year.
  """
  def generate_full_year(year) do
    results =
      for season <- 0..3 do
        Logger.info("Generating Season #{season}, #{year}...")
        {start_date, end_date} = get_season_dates(season, year)

        season_struct = %Season{
          name: "Season #{season} #{year}",
          year: year,
          starts_at: start_date,
          ends_at: end_date
        }

        tournaments = SeasonTournamentGenerator.generate_season_tournaments(season_struct)

        {success_count, failed_count} =
          Enum.reduce(tournaments, {0, 0}, fn changeset, {success, failed} ->
            case Repo.insert(changeset) do
              {:ok, _tournament} -> {success + 1, failed}
              {:error, _changeset} -> {success, failed + 1}
            end
          end)

        Logger.info("Season #{season}: #{success_count} inserted, #{failed_count} failed")
        {season, success_count, failed_count}
      end

    total_success = results |> Enum.map(fn {_, s, _} -> s end) |> Enum.sum()
    total_failed = results |> Enum.map(fn {_, _, f} -> f end) |> Enum.sum()

    Logger.info("\nYear #{year} Summary:")
    Logger.info("Total tournaments inserted: #{total_success}")
    Logger.info("Total failures: #{total_failed}")

    {:ok, results}
  end

  @doc """
  Preview tournaments without inserting them into the database.
  """
  def preview_season(season_or_id, year \\ nil) do
    # Get or create season struct
    season_struct =
      case {season_or_id, year} do
        {%Season{} = season, _} ->
          season

        {season_id, nil} when is_integer(season_id) or is_binary(season_id) ->
          Season.get!(season_id)

        {season_num, year} when is_integer(season_num) and is_integer(year) ->
          {start_date, end_date} = get_season_dates(season_num, year)

          %Season{
            name: "Season #{season_num} #{year}",
            year: year,
            starts_at: start_date,
            ends_at: end_date
          }
      end

    tournaments = SeasonTournamentGenerator.generate_season_tournaments(season_struct)

    Logger.info("Preview for #{season_struct.name}:")
    print_tournament_summary(tournaments)
    print_sample_tournaments(tournaments)

    tournaments
  end

  defp print_tournament_summary(tournaments) do
    summary =
      tournaments
      |> Enum.group_by(& &1.changes.grade)
      |> Enum.map(fn {grade, tournaments} -> {grade, length(tournaments)} end)
      |> Enum.sort()

    Enum.each(summary, fn {grade, count} ->
      Logger.info("  #{String.pad_trailing(grade, 12)}: #{count} tournaments")
    end)
  end

  defp print_sample_tournaments(tournaments) do
    Logger.info("\nSample tournaments:")

    # Show one tournament from each grade
    tournaments
    |> Enum.group_by(& &1.changes.grade)
    |> Enum.each(fn {grade, grade_tournaments} ->
      sample = List.first(grade_tournaments)
      starts_at = sample.changes.starts_at

      Logger.info("  #{grade}:")
      Logger.info("    Name: #{sample.changes.name}")
      Logger.info("    Starts: #{DateTime.to_string(starts_at)}")
      Logger.info("    Players: #{sample.changes.players_limit}")
      Logger.info("    Task Provider: #{sample.changes.task_provider}")

      if sample.changes.task_pack_name do
        Logger.info("    Task Pack: #{sample.changes.task_pack_name}")
      end

      Logger.info("")
    end)
  end

  # Helper function to get season dates for backward compatibility
  defp get_season_dates(season, year) do
    case season do
      0 -> {Date.new!(year, 9, 21), Date.new!(year, 12, 21)}
      1 -> {Date.new!(year, 12, 21), Date.new!(year + 1, 3, 21)}
      2 -> {Date.new!(year, 3, 21), Date.new!(year, 6, 21)}
      3 -> {Date.new!(year, 6, 21), Date.new!(year, 9, 21)}
    end
  end
end
