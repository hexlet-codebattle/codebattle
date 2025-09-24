defmodule Codebattle.Tournament.TournamentResult do
  @moduledoc false

  use Ecto.Schema

  import Ecto.Query

  alias Codebattle.Clan
  alias Codebattle.Repo
  alias Codebattle.Tournament

  @loss_score 0
  @win_score 1

  @type t :: %__MODULE__{}

  schema "tournament_results" do
    field(:clan_id, :integer)
    field(:duration_sec, :integer)
    field(:game_id, :integer)
    field(:was_cheated, :boolean, default: false)
    field(:level, :string)
    field(:result_percent, :decimal)
    field(:round_position, :integer)
    field(:score, :integer)
    field(:task_id, :integer)
    field(:tournament_id, :integer)
    field(:user_id, :integer)
    field(:user_name, :string)
  end

  def get_by(tournament_id) do
    __MODULE__
    |> where([tr], tr.tournament_id == ^tournament_id)
    |> Repo.all()
  end

  @doc """
  Calculates the score for each player based on the tasks that all players solved.

  1. Obtain the 25th percentile for each task based on the winners game time, it will be the base_score
  2. Then we scale from 1 to 2 base_score for each winner.
     - min time winner gets 2 base_score
     - max time winner gets 1 base_score
     - intermediate gets linearly between 1 and 2 base_score based on their game time

  3. Each player has a tests `result_percent` ranging from 100% to 0%, where the winner always has 100%.
  4. For players that lost the game we take duration_sec and scale it from 1 to 2 base_score * (result_percent/2).

  Example:
    - winner_times in seconds: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]
    - 25 percentile: 30 seconds = base_score
    - player with time 10 gets 2 base_score (10 is 100% between min and max)
    - player with time 20 gets 1.75 base_score (20 is 75% between min and max)
    - player with time 90 gets 1.05 base_score (90 is 5% between min and max)
    - player with time 100 gets 1 base_score (100 is 0% between min and max)
    - player that lost with time 20 and result_percent 80 gets 0.88 * 1.75 base_score
    - player with time 160 and result_percent 20 gets (0.2 * 0.5 base_score)
  """
  @spec upsert_results(tounament :: Tournament.t() | map()) :: Tournament.t()
  def upsert_results(%{type: type, ranking_type: "by_user", score_strategy: "75_percentile"} = tournament)
      when type in ["swiss", "arena", "top200"] do
    clean_results(tournament.id)

    Repo.query!("""
      with duration_percentile_for_tasks
      as (
      SELECT
      task_id,
      CASE
        WHEN COUNT(*) = 0 THEN 0
        ELSE PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY duration_sec ASC)
      END AS base_score,
      min(duration_sec) as min_duration,
      max(duration_sec) as max_duration
      FROM
      games g
      where tournament_id = #{tournament.id}
      and state = 'game_over'
      and id not in (
        select distinct g.id from user_games ug inner join games g on g.id = ug.game_id
        where ug.is_bot = 't' and ug.result = 'won' and g.tournament_id = #{tournament.id}
      )
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
      g.round_position,
      g.was_cheated,
      COALESCE(dt.base_score, 0) AS base_score,
      COALESCE(dt.min_duration, 0) AS min_duration,
      COALESCE(dt.max_duration, 0) AS max_duration,
      CASE
      -- Handle timeout case where both players lost
      WHEN g.state = 'timeout' THEN
        0.5 * COALESCE(dt.base_score, 0) * COALESCE((p.player_info->>'result_percent')::numeric, 0) / 100.0
      ELSE
        COALESCE(dt.base_score, 0) * (
          2 - ((g.duration_sec - COALESCE(dt.min_duration, 0))::numeric / GREATEST(COALESCE(dt.max_duration - COALESCE(dt.min_duration, 0), 1), 1))
        ) * COALESCE((p.player_info->>'result_percent')::numeric, 0) / 100.0
      END AS score,
      g.level,
      g.task_id,
      g.id
      from games g
      CROSS JOIN LATERAL
      jsonb_array_elements(g.players) AS p(player_info)
      left join duration_percentile_for_tasks dt
      on dt.task_id = g.task_id
      where g.tournament_id = #{tournament.id}
      and (p.player_info->>'is_bot')::boolean = 'f'
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
      result_percent,
      round_position,
      was_cheated
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
      result_percent,
      round_position,
      was_cheated
      from stats
    """)

    tournament
  end

  def upsert_results(%{type: type, ranking_type: "by_user", score_strategy: "win_loss"} = tournament)
      when type in ["swiss", "arena"] do
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
      g.round_position,
      g.was_cheated,
      CASE WHEN (p.player_info->'result_percent')::numeric = 100.0
        THEN #{@win_score}
        ELSE #{@loss_score}
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
      result_percent,
      round_position,
      was_cheated
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
      result_percent,
      round_position,
      was_cheated
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

  def get_users_history(tournament, user_ids) do
    from(tr in __MODULE__,
      where: tr.tournament_id == ^tournament.id,
      where: tr.user_id in ^user_ids,
      inner_join: tr2 in __MODULE__,
      on: tr.game_id == tr2.game_id and tr2.user_id != tr.user_id,
      group_by: [tr.round_position, tr.user_id, tr2.user_id],
      select: %{
        user_id: tr.user_id,
        user_name: max(tr.user_name),
        opponent_id: tr2.user_id,
        round_position: tr.round_position,
        score: coalesce(sum(tr.score), 0),
        opponent_score: coalesce(sum(tr2.score), 0),
        game_details:
          fragment(
            "array_agg(json_build_object('task_id', ?, 'game_id', ?, 'result_percent', ?, 'opponent_result_percent', ?))",
            tr.task_id,
            tr.game_id,
            tr.result_percent,
            tr2.result_percent
          ),
        opponent_name: max(tr2.user_name),
        opponent_clan_id: max(tr2.clan_id)
      }
    )
    |> Repo.all()
    |> Enum.sort_by(&(-&1.round_position))
    |> Enum.reduce(%{}, fn result, acc ->
      task_history = %{
        score: result.score,
        round: result.round_position + 1,
        opponent_id: result.opponent_id,
        opponent_clan_id: result.opponent_clan_id,
        player_win_status:
          (result.score == result.opponent_score && result.user_id < result.opponent_id) ||
            result.score > result.opponent_score,
        solved_tasks:
          result.game_details
          |> Enum.sort_by(& &1["game_id"])
          |> Enum.map(fn game_result ->
            cond do
              game_result["result_percent"] == 100.0 -> "won"
              game_result["opponent_result_percent"] == 100.0 -> "lost"
              true -> "timeout"
            end
          end)
      }

      Map.update(acc, result.user_id, [task_history], &[task_history | &1])
    end)
  end

  def get_user_ranking(%{use_clan: false} = tournament) do
    query =
      from(r in __MODULE__,
        left_join: c in Clan,
        on: r.clan_id == c.id,
        select: %{
          id: r.user_id,
          name: r.user_name,
          clan_id: c.id,
          clan: c.name,
          score: sum(r.score),
          place: over(row_number(), :overall_partition)
        },
        where: r.tournament_id == ^tournament.id,
        group_by: [r.user_id, r.user_name, c.id],
        order_by: [desc: sum(r.score), asc: sum(r.duration_sec)],
        windows: [overall_partition: [order_by: [desc: sum(r.score), asc: sum(r.duration_sec)]]]
      )

    query
    |> Repo.all()
    |> Enum.reduce(%{}, fn %{id: id} = value, acc ->
      Map.put(acc, id, value)
    end)
  end

  def get_user_ranking(%{use_clan: true} = tournament) do
    query =
      from(r in __MODULE__,
        left_join: c in Clan,
        on: r.clan_id == c.id,
        select: %{
          id: r.user_id,
          name: r.user_name,
          clan_id: c.id,
          clan: c.name,
          score: sum(r.score),
          place: over(row_number(), :overall_partition)
        },
        where: r.tournament_id == ^tournament.id,
        group_by: [r.user_id, r.user_name, c.id],
        order_by: [desc: sum(r.score), asc: sum(r.duration_sec)],
        windows: [overall_partition: [order_by: [desc: sum(r.score), asc: sum(r.duration_sec)]]]
      )

    query
    |> Repo.all()
    |> Enum.reduce(%{}, fn %{id: id} = value, acc ->
      Map.put(acc, id, value)
    end)
  end

  def get_user_ranking_for_round(tournament, round_position) do
    query =
      from(r in __MODULE__,
        select: %{
          id: r.user_id,
          score: sum(r.score),
          place: over(row_number(), :overall_partition)
        },
        where: r.tournament_id == ^tournament.id,
        where: r.round_position == ^round_position,
        group_by: [r.user_id],
        order_by: [desc: sum(r.score), asc: sum(r.duration_sec), asc: r.user_id],
        windows: [
          overall_partition: [
            order_by: [desc: sum(r.score), asc: sum(r.duration_sec), asc: r.user_id]
          ]
        ]
      )

    query
    |> Repo.all()
    |> Enum.reduce(%{}, fn %{id: id} = value, acc ->
      Map.put(acc, id, value)
    end)
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
        ROUND(PERCENTILE_CONT(0.05) WITHIN GROUP (ORDER BY duration_sec)::numeric, 2) AS p5,
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
        and result_percent = 100.0
    GROUP BY
        tr.task_id
    )
    SELECT
        t.name, t.level, td.*
    FROM
        tasks_data td
    INNER JOIN
        tasks t ON t.id = td.task_id
    ORDER BY wins_count DESC
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
        AND score > 0
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

  def get_top_user_by_task_ranking(tournament, task_id, limit \\ 30) do
    query =
      from(r in __MODULE__,
        join: c in Clan,
        on: r.clan_id == c.id,
        group_by: [r.user_id, c.id, r.duration_sec, r.score, r.game_id],
        where: r.tournament_id == ^tournament.id,
        where: r.task_id == ^task_id,
        where: r.result_percent == 100.0,
        where: r.score > 0,
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
      columns |> Enum.zip(row) |> Map.new()
    end)
  end
end
