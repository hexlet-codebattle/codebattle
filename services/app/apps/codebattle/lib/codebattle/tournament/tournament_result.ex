defmodule Codebattle.Tournament.TournamentResult do
  @moduledoc false

  alias Codebattle.Clan
  alias Codebattle.Repo
  alias Codebattle.Tournament
  alias Codebattle.Tournament.Score.WinLoss

  use Ecto.Schema
  import Ecto.Query

  @type t :: %__MODULE__{}

  schema "tournament_results" do
    field(:tournament_id, :integer)
    field(:game_id, :integer)
    field(:user_id, :integer)
    field(:user_name, :string)
    field(:clan_id, :integer)
    field(:task_id, :integer)
    field(:score, :integer)
    field(:level, :string)
    field(:duration_sec, :integer)
    field(:result_percent, :decimal)
  end

  def get_by(tournament_id) do
    __MODULE__
    |> where([tr], tr.tournament_id == ^tournament_id)
    |> Repo.all()
  end

  @doc """
    Here we calculate the score for each player based on the tasks that all players solved.
    1. Obtain the 95th percentile for each task based on the winners game time.
    2. Calculate the `time_coefficient` for each player based on their game time:
      - `time_coefficient` equals 100% if their time is less than the 95th percentile.
      - `time_coefficient` equals 30% for the slowest time among all winners.
      - `time_coefficient` linearly decreases from 100% to 30% based on the line
         from the 95th percentile time to the slowest time.
    3. Each task level has a `base_score`:
      - Elementary: 30
      - Easy: 100
      - Medium: 300
      - Hard: 1000
    4. Each player has a `test_result_percent` ranging from 100% to 0%, where the winner always has 100%.
    5. The final score is calculated as `base_score` * `time_coefficient` * `test_result_percent`.

    Example:
    Task level is hard, so the base score = 1000
    95th Percentile = 104.0 seconds

  """
  @spec upsert_results(tounament :: Tournament.t() | map()) :: Tournament.t()
  def upsert_results(tournament = %{type: "arena", ranking_type: "by_player_95th_percentile"}) do
    clean_results(tournament.id)

    Repo.query!("""
      with duration_percentile_for_tasks
      as (
      SELECT
      task_id,
      count(*),
      case
        when level = 'elementary' THEN 30.0
        when level = 'easy' THEN 100.0
        when level = 'medium' THEN 300.0
        when level = 'hard' THEN 1000.0
      end AS base_score,
      array_agg(duration_sec),
      max(duration_sec) as max_duration,
      PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_sec ASC) AS percentile_95,
      PERCENTILE_CONT(0.05) WITHIN GROUP (ORDER BY duration_sec ASC) AS percentile_5
      FROM
      games g
      where tournament_id = #{tournament.id}
      and state = 'game_over'
      GROUP BY
      task_id, level),

      stats as (
      select
      (p.player_info->>'result_percent')::numeric AS result_percent,
      (p.player_info->>'id')::integer AS user_id,
      (p.player_info->>'name')::text AS user_name,
      (p.player_info->>'clan_id')::integer AS clan_id,
      g.duration_sec,
      g.tournament_id,
      g.id as game_id,
      dt.percentile_95,
      dt.percentile_5,
      dt.base_score,
      CASE
      WHEN g.duration_sec <= dt.percentile_5 THEN base_score
      WHEN g.duration_sec >= dt.percentile_95 THEN base_score * 0.3
      ELSE base_score - (base_score * 0.7 * (g.duration_sec - dt.percentile_5) / (dt.percentile_95 - dt.percentile_5))
      END AS score,
      g.level,
      g.task_id,
      g.id
      from games g
      CROSS JOIN LATERAL
      jsonb_array_elements(g.players) AS p(player_info)
      inner join duration_percentile_for_tasks dt
      on dt.task_id = g.task_id
      where g.tournament_id = #{tournament.id}
      and state in ('game_over', 'timeout')
      )
      insert into tournament_results
      (
      tournament_id,
      game_id,
      user_id,
      user_name,
      clan_id,
      task_id,
      score,
      level,
      duration_sec,
      result_percent
      )
      select
      tournament_id,
      game_id,
      user_id,
      user_name,
      clan_id,
      task_id,
      COALESCE(result_percent * score / 100.0, 0) as score,
      level,
      duration_sec,
      result_percent
      from stats
    """)

    tournament
  end

  def upsert_results(tournament = %{type: "arena", score_strategy: "win_loss"}) do
    clean_results(tournament.id)

    Repo.query!("""
      with stats as (
      select
      (p.player_info->>'result_percent')::numeric AS result_percent,
      (p.player_info->>'id')::integer AS user_id,
      (p.player_info->>'name')::text AS user_name,
      (p.player_info->>'clan_id')::integer AS clan_id,
      g.duration_sec,
      g.level,
      g.tournament_id,
      g.task_id,
      g.id as game_id,
      CASE
      WHEN (p.player_info->'result_percent')::numeric = 100.0 THEN
        CASE
          WHEN g.level = 'elementary' THEN #{WinLoss.game_level_score("elementary")}
          WHEN g.level = 'easy' THEN #{WinLoss.game_level_score("easy")}
          WHEN g.level = 'medium' THEN #{WinLoss.game_level_score("medium")}
          WHEN g.level = 'hard' THEN #{WinLoss.game_level_score("hard")}
          ELSE 0
        END
      ELSE #{WinLoss.loss_score()}
      END AS score
      FROM games g
      CROSS JOIN LATERAL
      jsonb_array_elements(g.players) AS p(player_info)
      where g.tournament_id = #{tournament.id}
      and (p.player_info->>'is_bot')::boolean = 'f'
      )
      insert into tournament_results
      (
      tournament_id,
      game_id,
      user_id,
      user_name,
      clan_id,
      task_id,
      score,
      level,
      duration_sec,
      result_percent
      )
      select
      tournament_id,
      game_id,
      user_id,
      user_name,
      clan_id,
      task_id,
      score,
      level,
      duration_sec,
      result_percent
      from stats
    """)

    tournament
  end

  def upsert_results(t), do: t

  def clean_results(tournament_id) do
    __MODULE__
    |> where([tr], tr.tournament_id == ^tournament_id)
    |> Repo.delete_all()
  end

  def get_user_ranking(tournament) do
    query =
      from(r in __MODULE__,
        select: %{
          id: r.user_id,
          score: sum(r.score),
          place: over(row_number(), :overall_partition)
        },
        where: r.tournament_id == ^tournament.id,
        group_by: [r.user_id],
        order_by: [desc: sum(r.score)],
        windows: [overall_partition: [order_by: [desc: sum(r.score), asc: sum(r.duration_sec)]]]
      )

    Repo.all(query)
  end

  def get_top_users_by_clan_ranking(tournament, players_limit \\ 5, clans_limit \\ 7) do
    """
    WITH PlayerAggregates AS (
      SELECT
          tr.clan_id,
          tr.user_id,
          tr.user_name,
          SUM(tr.score) AS total_score,
          SUM(tr.duration_sec) AS total_duration_sec,
          SUM(CASE WHEN tr.result_percent = 100.0 THEN 1 ELSE 0 END) AS wins_count
      FROM
          tournament_results tr
      WHERE
          tr.tournament_id = #{tournament.id}
      GROUP BY
          tr.clan_id, tr.user_id, tr.user_name
    ),
    TopPlayers AS (
      SELECT
          pa.clan_id,
          pa.user_id,
          pa.user_name,
          pa.total_score,
          pa.total_duration_sec,
          pa.wins_count,
          ROW_NUMBER() OVER (PARTITION BY pa.clan_id ORDER BY pa.total_score DESC) AS player_rank
      FROM
          PlayerAggregates pa
    ),
    Top5Players AS (
      SELECT
          tp.clan_id,
          tp.user_id,
          tp.user_name,
          tp.total_score,
          tp.total_duration_sec,
          tp.wins_count
      FROM
          TopPlayers tp
      WHERE
          tp.player_rank <= #{players_limit}
    ),
    ClanScores AS (
      SELECT
          t5p.clan_id,
          SUM(t5p.total_score) AS total_clan_score,
          ROW_NUMBER() OVER (ORDER BY SUM(t5p.total_score) DESC) AS clan_rank
      FROM
          Top5Players t5p
      GROUP BY
          t5p.clan_id
      ORDER BY
          total_clan_score DESC
      LIMIT #{clans_limit}
    ),
    Top7ClansTop5Players AS (
      SELECT
          tp.clan_id,
          tp.user_id,
          tp.user_name,
          tp.total_score,
          tp.total_duration_sec,
          tp.wins_count,
          cs.clan_rank
      FROM
          Top5Players tp
      JOIN
          ClanScores cs ON tp.clan_id = cs.clan_id
    )
    SELECT
      t.clan_id,
      c.name AS clan_name,
      c.long_name AS clan_long_name,
      t.user_id,
      t.user_name,
      t.total_score,
      t.total_duration_sec,
      t.wins_count,
      t.clan_rank
    FROM
      Top7ClansTop5Players t
    INNER JOIN
      clans c ON t.clan_id = c.id
    ORDER BY
      t.clan_rank,
      t.total_score DESC
    """
    |> Repo.query!()
    |> map_repo_result()
  end

  def get_tasks_ranking(tournament) do
    """
    WITH tasks_data AS (
    SELECT
        ROUND(MIN(duration_sec)::numeric, 2) AS min,
        ROUND(PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY duration_sec)::numeric, 2) AS p5,
        ROUND(PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY duration_sec)::numeric, 2) AS p25,
        ROUND(PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY duration_sec)::numeric, 2) AS p50,
        ROUND(PERCENTILE_CONT(0.85) WITHIN GROUP (ORDER BY duration_sec)::numeric, 2) AS p75,
        ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_sec)::numeric, 2) AS p95,
        ROUND(MAX(duration_sec)::numeric, 2) AS max,
        tr.task_id,
        SUM(CASE WHEN tr.result_percent = 100.0 THEN 1 ELSE 0 END) AS wins_count
    FROM
        tournament_results tr
    WHERE
        tr.tournament_id = #{tournament.id}
    GROUP BY
        tr.task_id
    )
    SELECT
        t.name, t.level, td.*
    FROM
        tasks_data td
    INNER JOIN
        tasks t ON t.id = td.task_id
    ORDER BY
        CASE
          WHEN t.level = 'hard' THEN 1
          WHEN t.level = 'medium' THEN 2
          WHEN t.level = 'easy' THEN 3
          ELSE 4
        END,
        min DESC
    """
    |> Repo.query!()
    |> map_repo_result()
  end

  def get_task_duration_distribution(tournament, task_id) do
    """
    WITH DurationStats AS (
    SELECT
        MIN(duration_sec) AS min_duration,
        MAX(duration_sec) AS max_duration
    FROM
        tournament_results
    WHERE
        tournament_id = #{tournament.id}
        AND task_id = #{task_id}
        AND result_percent = 100.0
    ),
    IntervalParams AS (
    SELECT
        min_duration,
        max_duration,
        15 AS num_intervals,
        (max_duration - min_duration) / 15.0 AS interval_step
    FROM
        DurationStats
    ),
    Intervals AS (
    SELECT
        min_duration + (interval_step * generate_series) AS interval_start,
        min_duration + (interval_step * (generate_series + 1)) AS interval_end
    FROM
        IntervalParams,
        generate_series(0, 15)
    )
    SELECT
      CEIL(interval_start)::int AS start,
      CEIL(interval_end)::int AS end,
      COUNT(tr.duration_sec) AS wins_count
    FROM
      Intervals
    LEFT JOIN
      tournament_results tr
    ON
      tr.duration_sec >= interval_start
      AND tr.duration_sec < interval_end
      AND tr.task_id = #{task_id}
      AND tr.result_percent = 100.0
      AND tr.tournament_id = #{tournament.id}
    GROUP BY
      interval_start, interval_end
    ORDER BY
      interval_start
    """
    |> Repo.query!()
    |> map_repo_result()
  end

  def get_clans_bubble_distribution(tournament, max_radius \\ 7, limit \\ 10) do
    """
    WITH clans_result AS (
    SELECT
        tr.clan_id,
        COUNT(DISTINCT tr.user_id) AS player_count,
        SUM(tr.score) AS total_score,
        SUM(tr.score) / NULLIF(COUNT(DISTINCT tr.user_id), 0) AS performance,
        CASE
            WHEN (player_counts.max_player_count - player_counts.min_player_count) != 0
            THEN (ROUND((1.0 *(COUNT(DISTINCT tr.user_id) - player_counts.min_player_count) /  (player_counts.max_player_count - player_counts.min_player_count)) * #{max_radius - 1}) + 1)::int
            ELSE 1
        END AS radius
    FROM
        tournament_results tr,
        (SELECT MIN(cnt) AS min_player_count, MAX(cnt) AS max_player_count FROM (SELECT COUNT(DISTINCT user_id) AS cnt FROM tournament_results GROUP BY clan_id) AS counts) AS player_counts
    WHERE
        tr.tournament_id = #{tournament.id}
    GROUP BY
        tr.clan_id, player_counts.min_player_count, player_counts.max_player_count
    )
    SELECT
      c.id AS clan_id,
      c.name AS clan_name,
      c.long_name AS clan_long_name,
      cr.total_score,
      cr.player_count,
      cr.performance,
      cr.radius
    FROM
      clans_result cr
    INNER JOIN
      clans c ON cr.clan_id = c.id
    ORDER BY
      cr.total_score DESC
    LIMIT
      #{limit}
    """
    |> Repo.query!()
    |> map_repo_result()
  end

  def get_top_user_by_task_ranking(tournament, task_id, limit \\ 10) do
    limit = min(limit, 100)

    query =
      from(r in __MODULE__,
        join: c in Clan,
        on: r.clan_id == c.id,
        group_by: [r.user_id, c.id, r.duration_sec, r.score, r.game_id],
        where: r.tournament_id == ^tournament.id,
        where: r.task_id == ^task_id,
        where: r.result_percent == 100.0,
        order_by: [asc: r.duration_sec],
        limit: ^limit,
        select: %{
          clan_id: c.id,
          clan_long_name: c.long_name,
          clan_name: c.name,
          duration_sec: r.duration_sec,
          game_id: r.game_id,
          score: r.score,
          user_id: r.user_id,
          user_name: max(r.user_name)
        }
      )

    Repo.all(query)
  end

  defp map_repo_result(result) do
    columns = Enum.map(result.columns, &String.to_atom/1)

    Enum.map(result.rows, fn row ->
      Enum.zip(columns, row) |> Enum.into(%{})
    end)
  end
end
