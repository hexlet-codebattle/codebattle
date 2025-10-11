defmodule Codebattle.User.PointsAndRankUpdate do
  @moduledoc """
  Module for recalculation and update in db users graded tournaments points and ranking for all users.

  Calculates points for the current season only and stores them in the user.points field.
  """

  alias Codebattle.Repo
  alias Ecto.Adapters.SQL

  @doc """
  Updates user points and rankings based on tournament performance in current season.

  Point distribution by grade:
  - rookie: [8, 4, 2] for top 3
  - challenger: [64, 32, 16, 8, 4, 2] for top 6
  - pro: [128, 64, 32, 16, 8, 4, 2] for top 7
  - elite: [256, 128, 64, 32, 16, 8, 4, 2] for top 8
  - masters: [1024, 512, 256, 128, 64, 32, 16, 8, 4, 2] for top 10
  - grand_slam: [2048, 1024, 512, 256, 128, 64, 32, 16, 8, 4, 2] for top 11

  All other participants who are not in winner_ids get 2 points.
  Open grade tournaments give no points.

  Updates the current season points in points field and rank.
  """
  def update do
    {current_season, season_start, season_end} = get_current_season_info()

    sql = """
      WITH season_info AS (
        SELECT
          #{current_season} AS current_season,
          '#{Date.to_string(season_start)}'::date AS season_start,
          '#{Date.to_string(season_end)}'::date AS season_end
      ),

      grade_points AS (
        SELECT 'rookie' as grade, UNNEST(ARRAY[8, 4, 2]) as points, GENERATE_SERIES(1, 3) as position
        UNION ALL
        SELECT 'challenger' as grade, UNNEST(ARRAY[64, 32, 16, 8, 4, 2]) as points, GENERATE_SERIES(1, 6) as position
        UNION ALL
        SELECT 'pro' as grade, UNNEST(ARRAY[128, 64, 32, 16, 8, 4, 2]) as points, GENERATE_SERIES(1, 7) as position
        UNION ALL
        SELECT 'elite' as grade, UNNEST(ARRAY[256, 128, 64, 32, 16, 8, 4, 2]) as points, GENERATE_SERIES(1, 8) as position
        UNION ALL
        SELECT 'masters' as grade, UNNEST(ARRAY[1024, 512, 256, 128, 64, 32, 16, 8, 4, 2]) as points, GENERATE_SERIES(1, 10) as position
        UNION ALL
        SELECT 'grand_slam' as grade, UNNEST(ARRAY[2048, 1024, 512, 256, 128, 64, 32, 16, 8, 4, 2]) as points, GENERATE_SERIES(1, 11) as position
      ),

      current_season_tournaments AS (
        SELECT t.id, t.grade, t.winner_ids, t.finished_at
        FROM tournaments t
        CROSS JOIN season_info si
        WHERE t.state = 'finished'
          AND t.grade != 'open'
          AND t.finished_at >= si.season_start
          AND t.finished_at <= si.season_end
      ),

      tournament_winner_points AS (
        SELECT
          t.id as tournament_id,
          w.user_id,
          w.position,
          COALESCE(gp.points, 2) as points
        FROM current_season_tournaments t
        CROSS JOIN LATERAL (
          SELECT
            UNNEST(t.winner_ids) as user_id,
            GENERATE_SERIES(1, ARRAY_LENGTH(t.winner_ids, 1)) as position
        ) w
        LEFT JOIN grade_points gp ON gp.grade = t.grade AND gp.position = w.position
      ),

      tournament_participant_points AS (
        SELECT
          tr.tournament_id,
          tr.user_id,
          2 as points
        FROM tournament_results tr
        JOIN current_season_tournaments cst ON cst.id = tr.tournament_id
        WHERE tr.user_id NOT IN (
          SELECT UNNEST(cst.winner_ids)
          FROM current_season_tournaments cst2
          WHERE cst2.id = tr.tournament_id
        )
        GROUP BY tr.tournament_id, tr.user_id
      ),

      all_tournament_points AS (
        SELECT tournament_id, user_id, points FROM tournament_winner_points
        UNION ALL
        SELECT tournament_id, user_id, points FROM tournament_participant_points
      ),

      user_season_points AS (
        SELECT
          user_id,
          SUM(points) as total_points
        FROM all_tournament_points
        GROUP BY user_id
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
          DENSE_RANK() OVER (ORDER BY su.season_points DESC, u.rating DESC) as new_rank
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

  @doc """
  Returns information about the current season dates.
  """
  def current_season_info do
    season_info_sql = """
      SELECT
        CASE
          WHEN (EXTRACT(MONTH FROM CURRENT_DATE) = 9 AND EXTRACT(DAY FROM CURRENT_DATE) >= 21) OR
               (EXTRACT(MONTH FROM CURRENT_DATE) IN (10, 11)) OR
               (EXTRACT(MONTH FROM CURRENT_DATE) = 12 AND EXTRACT(DAY FROM CURRENT_DATE) <= 21) THEN 'Season 0 (Sep 21 - Dec 21)'
          WHEN (EXTRACT(MONTH FROM CURRENT_DATE) = 12 AND EXTRACT(DAY FROM CURRENT_DATE) >= 21) OR
               (EXTRACT(MONTH FROM CURRENT_DATE) IN (1, 2)) OR
               (EXTRACT(MONTH FROM CURRENT_DATE) = 3 AND EXTRACT(DAY FROM CURRENT_DATE) <= 21) THEN 'Season 1 (Dec 21 - Mar 21)'
          WHEN (EXTRACT(MONTH FROM CURRENT_DATE) = 3 AND EXTRACT(DAY FROM CURRENT_DATE) >= 21) OR
               (EXTRACT(MONTH FROM CURRENT_DATE) IN (4, 5)) OR
               (EXTRACT(MONTH FROM CURRENT_DATE) = 6 AND EXTRACT(DAY FROM CURRENT_DATE) <= 21) THEN 'Season 2 (Mar 21 - Jun 21)'
          WHEN (EXTRACT(MONTH FROM CURRENT_DATE) = 6 AND EXTRACT(DAY FROM CURRENT_DATE) >= 21) OR
               (EXTRACT(MONTH FROM CURRENT_DATE) IN (7, 8)) OR
               (EXTRACT(MONTH FROM CURRENT_DATE) = 9 AND EXTRACT(DAY FROM CURRENT_DATE) <= 21) THEN 'Season 3 (Jun 21 - Sep 21)'
        END AS season_name,
        CASE
          WHEN (EXTRACT(MONTH FROM CURRENT_DATE) = 9 AND EXTRACT(DAY FROM CURRENT_DATE) >= 21) OR
               (EXTRACT(MONTH FROM CURRENT_DATE) IN (10, 11)) OR
               (EXTRACT(MONTH FROM CURRENT_DATE) = 12 AND EXTRACT(DAY FROM CURRENT_DATE) <= 21) THEN 0
          WHEN (EXTRACT(MONTH FROM CURRENT_DATE) = 12 AND EXTRACT(DAY FROM CURRENT_DATE) >= 21) OR
               (EXTRACT(MONTH FROM CURRENT_DATE) IN (1, 2)) OR
               (EXTRACT(MONTH FROM CURRENT_DATE) = 3 AND EXTRACT(DAY FROM CURRENT_DATE) <= 21) THEN 1
          WHEN (EXTRACT(MONTH FROM CURRENT_DATE) = 3 AND EXTRACT(DAY FROM CURRENT_DATE) >= 21) OR
               (EXTRACT(MONTH FROM CURRENT_DATE) IN (4, 5)) OR
               (EXTRACT(MONTH FROM CURRENT_DATE) = 6 AND EXTRACT(DAY FROM CURRENT_DATE) <= 21) THEN 2
          WHEN (EXTRACT(MONTH FROM CURRENT_DATE) = 6 AND EXTRACT(DAY FROM CURRENT_DATE) >= 21) OR
               (EXTRACT(MONTH FROM CURRENT_DATE) IN (7, 8)) OR
               (EXTRACT(MONTH FROM CURRENT_DATE) = 9 AND EXTRACT(DAY FROM CURRENT_DATE) <= 21) THEN 3
        END AS season_number
    """

    case SQL.query!(Repo, season_info_sql) do
      %{rows: [[season_name, season_number]]} ->
        %{
          season: season_name,
          season_number: season_number
        }

      _ ->
        nil
    end
  end

  @doc """
  Preview what points would be calculated for the current season without updating.
  Returns a list of users with their calculated points and ranks.
  """
  def preview_current_season_points do
    preview_sql = """
      WITH season_info AS (
        SELECT
          CASE
            WHEN (EXTRACT(MONTH FROM CURRENT_DATE) = 9 AND EXTRACT(DAY FROM CURRENT_DATE) >= 21) OR
                 (EXTRACT(MONTH FROM CURRENT_DATE) IN (10, 11)) OR
                 (EXTRACT(MONTH FROM CURRENT_DATE) = 12 AND EXTRACT(DAY FROM CURRENT_DATE) <= 21) THEN 0
            WHEN (EXTRACT(MONTH FROM CURRENT_DATE) = 12 AND EXTRACT(DAY FROM CURRENT_DATE) >= 21) OR
                 (EXTRACT(MONTH FROM CURRENT_DATE) IN (1, 2)) OR
                 (EXTRACT(MONTH FROM CURRENT_DATE) = 3 AND EXTRACT(DAY FROM CURRENT_DATE) <= 21) THEN 1
            WHEN (EXTRACT(MONTH FROM CURRENT_DATE) = 3 AND EXTRACT(DAY FROM CURRENT_DATE) >= 21) OR
                 (EXTRACT(MONTH FROM CURRENT_DATE) IN (4, 5)) OR
                 (EXTRACT(MONTH FROM CURRENT_DATE) = 6 AND EXTRACT(DAY FROM CURRENT_DATE) <= 21) THEN 2
            WHEN (EXTRACT(MONTH FROM CURRENT_DATE) = 6 AND EXTRACT(DAY FROM CURRENT_DATE) >= 21) OR
                 (EXTRACT(MONTH FROM CURRENT_DATE) IN (7, 8)) OR
                 (EXTRACT(MONTH FROM CURRENT_DATE) = 9 AND EXTRACT(DAY FROM CURRENT_DATE) <= 21) THEN 3
          END AS current_season
      )

      SELECT
        si.current_season,
        u.id as user_id,
        u.name,
        u.rating,
        u.points
      FROM users u
      CROSS JOIN season_info si
      WHERE u.is_bot = false
      ORDER BY u.points DESC, u.rating DESC
      LIMIT 50;
    """

    case SQL.query!(Repo, preview_sql) do
      %{rows: rows} ->
        Enum.map(rows, fn [season_num, user_id, name, rating, points] ->
          %{
            current_season: season_num,
            user_id: user_id,
            name: name,
            rating: rating,
            points: points
          }
        end)

      _ ->
        []
    end
  end

  @doc """
  Get a summary of tournament points for debugging and verification.
  """
  def tournament_summary do
    summary_sql = """
      SELECT
        t.id,
        t.name,
        t.grade,
        t.state,
        t.finished_at,
        ARRAY_LENGTH(t.winner_ids, 1) as winner_count,
        COUNT(DISTINCT tr.user_id) as participant_count
      FROM tournaments t
      LEFT JOIN tournament_results tr ON t.id = tr.tournament_id
      WHERE t.state = 'finished' AND t.grade != 'open'
      GROUP BY t.id, t.name, t.grade, t.state, t.finished_at, t.winner_ids
      ORDER BY t.finished_at DESC
      LIMIT 20;
    """

    case SQL.query!(Repo, summary_sql) do
      %{rows: rows} ->
        Enum.map(rows, fn [id, name, grade, state, finished_at, winner_count, participant_count] ->
          %{
            tournament_id: id,
            name: name,
            grade: grade,
            state: state,
            finished_at: finished_at,
            winner_count: winner_count || 0,
            participant_count: participant_count || 0
          }
        end)

      _ ->
        []
    end
  end

  defp get_current_season_info do
    today = Date.utc_today()
    {month, day} = {today.month, today.day}

    cond do
      # Season 0: Sep 21 - Dec 21
      (month == 9 and day >= 21) or month in [10, 11] or (month == 12 and day <= 21) ->
        {0, ~D[2024-09-21], ~D[2024-12-21]}

      # Season 1: Dec 21 - Mar 21
      (month == 12 and day >= 21) or month in [1, 2] or (month == 3 and day <= 21) ->
        {1, ~D[2024-12-21], ~D[2025-03-21]}

      # Season 2: Mar 21 - Jun 21
      (month == 3 and day >= 21) or month in [4, 5] or (month == 6 and day <= 21) ->
        {2, ~D[2025-03-21], ~D[2025-06-21]}

      # Season 3: Jun 21 - Sep 21
      (month == 6 and day >= 21) or month in [7, 8] or (month == 9 and day <= 21) ->
        {3, ~D[2025-06-21], ~D[2025-09-21]}
    end
  end
end
