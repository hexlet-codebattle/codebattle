defmodule Codebattle.User.PointsAndRankUpdate do
  # credo:disable-for-this-file Credo.Check.Refactor.CyclomaticComplexity
  @moduledoc """
  Module for recalculation and update in db users graded tournaments points and ranking for all users.

  Calculates points for the current season only and stores them in the user.points field.
  """

  alias Codebattle.Repo
  alias Codebattle.Season
  alias Ecto.Adapters.SQL

  @doc """
  Updates user points and rankings based on tournament performance in current season.

  Points and places are calculated in season_results based on current season tournaments.
  This function aligns user points and rank with the current season standings.
  """
  def update(season \\ nil) do
    case season || Season.get_current_season() do
      %Season{id: season_id} ->
        update_from_season_results(season_id)

      nil ->
        update_from_date_ranges()
    end
  end

  defp update_from_season_results(season_id) do
    sql = """
      WITH season_results_data AS (
        SELECT
          sr.user_id,
          sr.total_points,
          sr.place
        FROM season_results sr
        WHERE sr.season_id = $1
      ),
      max_place AS (
        SELECT COALESCE(MAX(place), 0) AS max_place
        FROM season_results
        WHERE season_id = $1
      ),
      fallback_rankings AS (
        SELECT
          u.id AS user_id,
          (SELECT max_place FROM max_place)
            + DENSE_RANK() OVER (ORDER BY u.rating DESC, u.id ASC) AS fallback_rank
        FROM users u
        LEFT JOIN season_results_data sr ON sr.user_id = u.id
        WHERE u.is_bot = false AND sr.user_id IS NULL
      ),
      user_rankings AS (
        SELECT
          u.id AS user_id,
          COALESCE(sr.total_points, 0) AS season_points,
          COALESCE(sr.place, fr.fallback_rank) AS new_rank
        FROM users u
        LEFT JOIN season_results_data sr ON sr.user_id = u.id
        LEFT JOIN fallback_rankings fr ON fr.user_id = u.id
        WHERE u.is_bot = false
      )
      UPDATE users
      SET
        points = ur.season_points,
        rank = ur.new_rank
      FROM user_rankings ur
      WHERE users.id = ur.user_id;
    """

    SQL.query!(Repo, sql, [season_id])
  end

  defp update_from_date_ranges do
    {current_season, season_start, season_end} = get_current_season_info()

    sql = """
      WITH season_info AS (
        SELECT
          #{current_season} AS current_season,
          '#{Date.to_string(season_start)}'::date AS season_start,
          '#{Date.to_string(season_end)}'::date AS season_end
      ),

      current_season_tournaments AS (
        SELECT t.id
        FROM tournaments t
        CROSS JOIN season_info si
        WHERE t.state = 'finished'
          AND t.grade != 'open'
          AND t.finished_at >= si.season_start
          AND t.finished_at <= si.season_end
      ),

      user_season_points AS (
        SELECT
          tur.user_id,
          SUM(tur.points) as total_points
        FROM tournament_user_results tur
        JOIN current_season_tournaments cst ON cst.id = tur.tournament_id
        GROUP BY tur.user_id
      ),

      season_update AS (
        SELECT
          si.current_season,
          u.id as user_id,
          COALESCE(usp.total_points, 0) as season_points
        FROM users u
        CROSS JOIN season_info si
        LEFT JOIN user_season_points usp ON u.id = usp.user_id
        WHERE u.is_bot = false
      ),

      user_rankings AS (
        SELECT
          su.*,
          DENSE_RANK() OVER (ORDER BY su.season_points DESC, u.rating DESC, u.id ASC) as new_rank
        FROM season_update su
        JOIN users u ON u.id = su.user_id
        WHERE u.is_bot = false
      )

      UPDATE users
      SET
        points = ur.season_points,
        rank = ur.new_rank
      FROM user_rankings ur
      WHERE users.id = ur.user_id;
    """

    SQL.query!(Repo, sql)
  end

  defp get_current_season_info do
    today = Date.utc_today()
    {month, day} = {today.month, today.day}

    cond do
      # Season 0: Sep 21 - Dec 21
      (month == 9 and day >= 21) or month in [10, 11] or (month == 12 and day <= 21) ->
        {0, ~D[2025-09-21], ~D[2025-12-21]}

      # Season 1: Dec 21 - Mar 21
      (month == 12 and day >= 21) or month in [1, 2] or (month == 3 and day <= 21) ->
        {1, ~D[2025-12-21], ~D[2026-03-21]}

      # Season 2: Mar 21 - Jun 21
      (month == 3 and day >= 21) or month in [4, 5] or (month == 6 and day <= 21) ->
        {2, ~D[2026-03-21], ~D[2026-06-21]}

      # Season 3: Jun 21 - Sep 21
      (month == 6 and day >= 21) or month in [7, 8] or (month == 9 and day <= 21) ->
        {3, ~D[2026-06-21], ~D[2026-09-21]}
    end
  end
end
