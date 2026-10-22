defmodule Codebattle.Tournament.SeasonTournamentGeneratorRunner do
  @moduledoc """
  Runner for the SeasonTournamentGenerator module.

  This module inserts into the database all tournaments generated
  from the SeasonTournamentGenerator module.
  """

  import Ecto.Query

  alias Codebattle.Repo
  alias Codebattle.Season
  alias Codebattle.Tournament
  alias Codebattle.Tournament.SeasonTournamentGenerator

  require Logger

  # What the generator decides about a tournament; re-applied to already generated ones.
  @synced_fields [
    :name,
    :description,
    :type,
    :players_limit,
    :rounds_limit,
    :level,
    :task_provider,
    :task_strategy,
    :task_pack_name,
    :break_duration_seconds,
    :timeout_mode,
    :round_timeout_seconds,
    :match_timeout_seconds,
    :score_strategy,
    :ranking_type,
    :access_type,
    :use_chat,
    :use_timer
  ]

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
  Re-applies the generator's current params to the season's tournaments that are still
  `upcoming` (not yet live, so no players or server). Each one is matched to the generated
  tournament with the same grade and start time; ones without a match (added or moved by
  hand) are left alone.
  """
  @spec update_upcoming_tournaments(Season.t()) ::
          {:ok,
           %{
             updated: non_neg_integer(),
             unchanged: non_neg_integer(),
             unmatched: non_neg_integer(),
             failed: non_neg_integer()
           }}
  def update_upcoming_tournaments(%Season{} = season) do
    generated =
      season
      |> SeasonTournamentGenerator.generate_season_tournaments()
      |> Map.new(fn changeset ->
        tournament = Ecto.Changeset.apply_changes(changeset)
        {{tournament.grade, DateTime.to_unix(tournament.starts_at)}, Map.take(tournament, @synced_fields)}
      end)

    season
    |> upcoming_season_tournaments()
    |> Enum.reduce(%{updated: 0, unchanged: 0, unmatched: 0, failed: 0}, fn tournament, counts ->
      case Map.fetch(generated, {tournament.grade, DateTime.to_unix(tournament.starts_at)}) do
        {:ok, params} -> Map.update!(counts, update_tournament(tournament, params), &(&1 + 1))
        :error -> Map.update!(counts, :unmatched, &(&1 + 1))
      end
    end)
    |> then(&{:ok, &1})
  end

  defp upcoming_season_tournaments(season) do
    from_datetime = DateTime.new!(season.starts_at, ~T[00:00:00], "Etc/UTC")
    to_datetime = DateTime.new!(season.ends_at, ~T[23:59:59], "Etc/UTC")

    Repo.all(
      from(t in Tournament,
        where: t.state == "upcoming" and t.grade != "open",
        where: t.starts_at >= ^from_datetime and t.starts_at <= ^to_datetime,
        order_by: t.id
      )
    )
  end

  defp update_tournament(tournament, params) do
    changeset = Tournament.changeset(tournament, params)

    cond do
      changeset.changes == %{} ->
        :unchanged

      match?({:ok, _}, Repo.update(changeset)) ->
        :updated

      true ->
        Logger.warning("Season tournament #{tournament.id} not updated: #{inspect(changeset.errors)}")
        :failed
    end
  end

  @doc """
  Generate tournaments for all 4 seasons of a given year.
  """
  def generate_full_year(year) do
    results =
      for season <- 0..3 do
        Logger.info("Generating Season #{season}, #{year}...")
        season_struct = build_season_struct(season, year)
        tournaments = SeasonTournamentGenerator.generate_season_tournaments(season_struct)
        {success_count, failed_count} = insert_tournaments(tournaments)

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

  defp build_season_struct(season, year) do
    {start_date, end_date} = get_season_dates(season, year)

    %Season{
      name: "Season #{season} #{year}",
      year: year,
      starts_at: start_date,
      ends_at: end_date
    }
  end

  defp insert_tournaments(tournaments) do
    Enum.reduce(tournaments, {0, 0}, fn changeset, {success, failed} ->
      update_insert_counts(Repo.insert(changeset), success, failed)
    end)
  end

  defp update_insert_counts({:ok, _tournament}, success, failed), do: {success + 1, failed}
  defp update_insert_counts({:error, _changeset}, success, failed), do: {success, failed + 1}

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
