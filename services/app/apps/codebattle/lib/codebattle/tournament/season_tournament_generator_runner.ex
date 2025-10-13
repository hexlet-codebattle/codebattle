defmodule Codebattle.Tournament.SeasonTournamentGeneratorRunner do
  @moduledoc """
  Runner for the SeasonTournamentGenerator module.

  This module inserts into the database all tournaments generated
  from the SeasonTournamentGenerator module.
  """

  alias Codebattle.Repo
  alias Codebattle.Tournament.SeasonTournamentGenerator

  require Logger

  @doc """
  Generate and insert all tournaments for Season 0, 2025.
  """
  def generate_season(season, year) do
    # Generate all tournament changesets
    Logger.info("Generating tournaments for Season #{season}, #{year}...")
    tournaments = SeasonTournamentGenerator.generate_season_tournaments(season, year)

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
        tournaments = SeasonTournamentGenerator.generate_season_tournaments(season, year)

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
  def preview_season(season, year) do
    tournaments = SeasonTournamentGenerator.generate_season_tournaments(season, year)

    Logger.info("Preview for Season #{season}, #{year}:")
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
end
