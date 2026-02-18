defmodule Codebattle.User.Achievements do
  @moduledoc """
  User achievements calculation and persistence.
  """

  import Ecto.Query

  alias Codebattle.Repo
  alias Codebattle.SeasonResult
  alias Codebattle.Tournament
  alias Codebattle.Tournament.TournamentUserResult
  alias Codebattle.User
  alias Codebattle.UserAchievement
  alias Codebattle.UserGame

  @games_milestones [10, 50] ++ Enum.to_list(100..1000//100) ++ Enum.to_list(1500..10_000//500)
  @tournament_milestones [1, 5, 10, 25, 50, 100]

  @types UserAchievement.types()

  @grade_rank %{
    "rookie" => 1,
    "challenger" => 2,
    "pro" => 3,
    "elite" => 4,
    "masters" => 5,
    "grand_slam" => 6
  }

  @rank_grade Map.new(@grade_rank, fn {grade, rank} -> {rank, grade} end)

  @spec get_user_achievements(integer() | String.t()) :: list(map())
  def get_user_achievements(user_id) do
    user_id = cast_user_id(user_id)

    UserAchievement
    |> where([a], a.user_id == ^user_id)
    |> order_by([a], asc: a.type)
    |> Repo.all()
    |> Enum.map(fn achievement ->
      %{type: to_string(achievement.type), meta: achievement.meta}
    end)
  end

  @spec recalculate_user(integer() | String.t()) :: :ok
  def recalculate_user(user_id) do
    user_id = cast_user_id(user_id)
    recalculate_many([user_id])
  end

  @spec recalculate_many([integer()]) :: :ok
  def recalculate_many(user_ids) do
    user_ids
    |> Enum.uniq()
    |> Enum.map(&cast_user_id/1)
    |> do_recalculate_many()

    :ok
  end

  @spec recalculate_all_users(pos_integer()) :: %{processed_users: non_neg_integer()}
  def recalculate_all_users(batch_size \\ 1000) do
    do_recalculate_all_users(0, batch_size, 0)
  end

  @spec calc_games_played_milestone(integer() | String.t()) :: map() | nil
  def calc_games_played_milestone(user_id) do
    user_id = cast_user_id(user_id)

    games_count =
      Repo.aggregate(
        from(ug in UserGame,
          where: ug.user_id == ^user_id
        ),
        :count,
        :id
      )

    case highest_milestone(games_count, @games_milestones) do
      nil -> nil
      value -> %{"count" => value, "label" => format_milestone(value)}
    end
  end

  @spec calc_graded_tournaments_played_milestone(integer() | String.t()) :: map() | nil
  def calc_graded_tournaments_played_milestone(user_id) do
    user_id = cast_user_id(user_id)

    tournaments_count =
      Repo.one(
        from(tur in TournamentUserResult,
          join: t in Tournament,
          on: t.id == tur.tournament_id,
          where: tur.user_id == ^user_id,
          where: t.state == "finished" and t.grade != "open",
          select: count(fragment("DISTINCT ?", tur.tournament_id))
        )
      ) || 0

    case highest_milestone(tournaments_count, @tournament_milestones) do
      nil -> nil
      value -> %{"count" => value, "label" => Integer.to_string(value)}
    end
  end

  @spec calc_highest_tournament_win_grade(integer() | String.t()) :: map() | nil
  def calc_highest_tournament_win_grade(user_id) do
    user_id = cast_user_id(user_id)

    highest_rank =
      Repo.one(
        from(tur in TournamentUserResult,
          join: t in Tournament,
          on: t.id == tur.tournament_id,
          where: tur.user_id == ^user_id,
          where: tur.place == 1,
          where: t.state == "finished" and t.grade != "open",
          select:
            max(
              fragment(
                "CASE ? WHEN 'rookie' THEN 1 WHEN 'challenger' THEN 2 WHEN 'pro' THEN 3 WHEN 'elite' THEN 4 WHEN 'masters' THEN 5 WHEN 'grand_slam' THEN 6 ELSE 0 END",
                t.grade
              )
            )
        )
      )

    case highest_rank do
      rank when is_integer(rank) and rank > 0 ->
        grade = Map.fetch!(@rank_grade, rank)
        %{"grade" => grade, "rank" => rank}

      _ ->
        nil
    end
  end

  @spec calc_polyglot(integer() | String.t()) :: map() | nil
  def calc_polyglot(user_id) do
    user_id = cast_user_id(user_id)

    langs =
      from(ug in UserGame,
        where: ug.user_id == ^user_id,
        where: ug.result == "won",
        where: not is_nil(ug.lang),
        distinct: ug.lang,
        select: ug.lang
      )
      |> Repo.all()
      |> Enum.sort()

    if length(langs) >= 3 do
      %{"count" => length(langs), "languages" => langs}
    end
  end

  @spec calc_season_champion_wins(integer() | String.t()) :: map() | nil
  def calc_season_champion_wins(user_id) do
    user_id = cast_user_id(user_id)

    wins =
      Repo.aggregate(
        from(sr in SeasonResult,
          where: sr.user_id == ^user_id and sr.place == 1
        ),
        :count,
        :id
      )

    if wins > 0, do: %{"count" => wins}
  end

  @spec calc_grand_slam_champion_wins(integer() | String.t()) :: map() | nil
  def calc_grand_slam_champion_wins(user_id) do
    user_id = cast_user_id(user_id)

    wins =
      Repo.aggregate(
        from(tur in TournamentUserResult,
          join: t in Tournament,
          on: t.id == tur.tournament_id,
          where: tur.user_id == ^user_id,
          where: tur.place == 1,
          where: t.state == "finished" and t.grade == "grand_slam"
        ),
        :count,
        :id
      )

    if wins > 0, do: %{"count" => wins}
  end

  @spec calc_best_win_streak(integer() | String.t()) :: map() | nil
  def calc_best_win_streak(user_id) do
    user_id = cast_user_id(user_id)

    results =
      Repo.all(
        from(ug in UserGame,
          where: ug.user_id == ^user_id,
          order_by: [asc: ug.inserted_at, asc: ug.id],
          select: ug.result
        )
      )

    best =
      results
      |> Enum.reduce({0, 0}, fn result, {current, max_value} ->
        if result == "won" do
          next_current = current + 1
          {next_current, max(next_current, max_value)}
        else
          {0, max_value}
        end
      end)
      |> elem(1)

    if best > 0, do: %{"count" => best}
  end

  defp do_recalculate_many([]), do: :ok

  defp do_recalculate_many(user_ids) do
    types = Enum.map(@types, &to_string/1)

    Repo.query!(
      """
      WITH requested_users AS (
        SELECT UNNEST($1::bigint[]) AS user_id
      ),
      input_users AS (
        SELECT u.id AS user_id
        FROM users u
        INNER JOIN requested_users ru
          ON ru.user_id = u.id
      ),
      game_stats_raw AS (
        SELECT
          iu.user_id,
          COUNT(*) FILTER (WHERE ug.result = 'won')::int AS won,
          COUNT(*) FILTER (WHERE ug.result = 'lost')::int AS lost,
          COUNT(*) FILTER (WHERE ug.result = 'gave_up')::int AS gave_up
        FROM input_users iu
        LEFT JOIN user_games ug
          ON ug.user_id = iu.user_id
        GROUP BY iu.user_id
      ),
      game_stats_achievement AS (
        SELECT
          gsr.user_id,
          'game_stats'::text AS type,
          jsonb_build_object(
            'won', gsr.won,
            'lost', gsr.lost,
            'gave_up', gsr.gave_up
          ) AS meta
        FROM game_stats_raw gsr
      ),
      games_counts AS (
        SELECT
          iu.user_id,
          COUNT(ug.id)::int AS games_count
        FROM input_users iu
        LEFT JOIN user_games ug
          ON ug.user_id = iu.user_id
        GROUP BY iu.user_id
      ),
      games_milestones AS (
        SELECT
          gc.user_id,
          CASE
            WHEN gc.games_count >= 10000 THEN 10000
            WHEN gc.games_count >= 9500 THEN 9500
            WHEN gc.games_count >= 9000 THEN 9000
            WHEN gc.games_count >= 8500 THEN 8500
            WHEN gc.games_count >= 8000 THEN 8000
            WHEN gc.games_count >= 7500 THEN 7500
            WHEN gc.games_count >= 7000 THEN 7000
            WHEN gc.games_count >= 6500 THEN 6500
            WHEN gc.games_count >= 6000 THEN 6000
            WHEN gc.games_count >= 5500 THEN 5500
            WHEN gc.games_count >= 5000 THEN 5000
            WHEN gc.games_count >= 4500 THEN 4500
            WHEN gc.games_count >= 4000 THEN 4000
            WHEN gc.games_count >= 3500 THEN 3500
            WHEN gc.games_count >= 3000 THEN 3000
            WHEN gc.games_count >= 2500 THEN 2500
            WHEN gc.games_count >= 2000 THEN 2000
            WHEN gc.games_count >= 1500 THEN 1500
            WHEN gc.games_count >= 1000 THEN 1000
            WHEN gc.games_count >= 900 THEN 900
            WHEN gc.games_count >= 800 THEN 800
            WHEN gc.games_count >= 700 THEN 700
            WHEN gc.games_count >= 600 THEN 600
            WHEN gc.games_count >= 500 THEN 500
            WHEN gc.games_count >= 400 THEN 400
            WHEN gc.games_count >= 300 THEN 300
            WHEN gc.games_count >= 200 THEN 200
            WHEN gc.games_count >= 100 THEN 100
            WHEN gc.games_count >= 50 THEN 50
            WHEN gc.games_count >= 10 THEN 10
            ELSE NULL
          END AS milestone
        FROM games_counts gc
      ),
      games_achievement AS (
        SELECT
          gm.user_id,
          'games_played_milestone'::text AS type,
          jsonb_build_object(
            'count',
            gm.milestone,
            'label',
            CASE
              WHEN gm.milestone >= 1000 AND gm.milestone % 1000 = 0 THEN (gm.milestone / 1000)::text || 'k'
              WHEN gm.milestone >= 1000 THEN TRIM(TRAILING '.0' FROM (gm.milestone::numeric / 1000)::text) || 'k'
              ELSE gm.milestone::text
            END
          ) AS meta
        FROM games_milestones gm
        WHERE gm.milestone IS NOT NULL
      ),
      tournament_counts AS (
        SELECT
          iu.user_id,
          COUNT(DISTINCT tur.tournament_id)::int AS tournaments_count
        FROM input_users iu
        LEFT JOIN tournament_user_results tur
          ON tur.user_id = iu.user_id
        LEFT JOIN tournaments t
          ON t.id = tur.tournament_id
         AND t.state = 'finished'
         AND t.grade != 'open'
        WHERE t.id IS NOT NULL
        GROUP BY iu.user_id
      ),
      tournament_milestones AS (
        SELECT
          tc.user_id,
          CASE
            WHEN tc.tournaments_count >= 100 THEN 100
            WHEN tc.tournaments_count >= 50 THEN 50
            WHEN tc.tournaments_count >= 25 THEN 25
            WHEN tc.tournaments_count >= 10 THEN 10
            WHEN tc.tournaments_count >= 5 THEN 5
            WHEN tc.tournaments_count >= 1 THEN 1
            ELSE NULL
          END AS milestone
        FROM tournament_counts tc
      ),
      tournament_achievement AS (
        SELECT
          tm.user_id,
          'graded_tournaments_played_milestone'::text AS type,
          jsonb_build_object('count', tm.milestone, 'label', tm.milestone::text) AS meta
        FROM tournament_milestones tm
        WHERE tm.milestone IS NOT NULL
      ),
      polyglot_raw AS (
        SELECT
          iu.user_id,
          ARRAY_REMOVE(ARRAY_AGG(DISTINCT ug.lang ORDER BY ug.lang), NULL) AS langs
        FROM input_users iu
        LEFT JOIN user_games ug
          ON ug.user_id = iu.user_id
         AND ug.result = 'won'
         AND ug.lang IS NOT NULL
        GROUP BY iu.user_id
      ),
      polyglot_achievement AS (
        SELECT
          pr.user_id,
          'polyglot'::text AS type,
          jsonb_build_object('count', CARDINALITY(pr.langs), 'languages', TO_JSONB(pr.langs)) AS meta
        FROM polyglot_raw pr
        WHERE CARDINALITY(pr.langs) >= 3
      ),
      highest_grade_raw AS (
        SELECT
          iu.user_id,
          MAX(
            CASE t.grade
              WHEN 'rookie' THEN 1
              WHEN 'challenger' THEN 2
              WHEN 'pro' THEN 3
              WHEN 'elite' THEN 4
              WHEN 'masters' THEN 5
              WHEN 'grand_slam' THEN 6
              ELSE 0
            END
          )::int AS rank
        FROM input_users iu
        LEFT JOIN tournament_user_results tur
          ON tur.user_id = iu.user_id
         AND tur.place = 1
        LEFT JOIN tournaments t
          ON t.id = tur.tournament_id
         AND t.state = 'finished'
         AND t.grade != 'open'
        GROUP BY iu.user_id
      ),
      highest_grade_achievement AS (
        SELECT
          hgr.user_id,
          'highest_tournament_win_grade'::text AS type,
          jsonb_build_object(
            'grade',
            CASE hgr.rank
              WHEN 1 THEN 'rookie'
              WHEN 2 THEN 'challenger'
              WHEN 3 THEN 'pro'
              WHEN 4 THEN 'elite'
              WHEN 5 THEN 'masters'
              WHEN 6 THEN 'grand_slam'
            END,
            'rank',
            hgr.rank
          ) AS meta
        FROM highest_grade_raw hgr
        WHERE hgr.rank > 0
      ),
      season_champion_raw AS (
        SELECT
          iu.user_id,
          COUNT(sr.id)::int AS wins
        FROM input_users iu
        LEFT JOIN season_results sr
          ON sr.user_id = iu.user_id
         AND sr.place = 1
        GROUP BY iu.user_id
      ),
      season_champion_achievement AS (
        SELECT
          scr.user_id,
          'season_champion_wins'::text AS type,
          jsonb_build_object('count', scr.wins) AS meta
        FROM season_champion_raw scr
        WHERE scr.wins > 0
      ),
      grand_slam_raw AS (
        SELECT
          iu.user_id,
          COUNT(tur.id)::int AS wins
        FROM input_users iu
        LEFT JOIN tournament_user_results tur
          ON tur.user_id = iu.user_id
         AND tur.place = 1
        LEFT JOIN tournaments t
          ON t.id = tur.tournament_id
         AND t.state = 'finished'
         AND t.grade = 'grand_slam'
        WHERE t.id IS NOT NULL
        GROUP BY iu.user_id
      ),
      grand_slam_achievement AS (
        SELECT
          gsr.user_id,
          'grand_slam_champion_wins'::text AS type,
          jsonb_build_object('count', gsr.wins) AS meta
        FROM grand_slam_raw gsr
        WHERE gsr.wins > 0
      ),
      tournaments_stats_raw AS (
        SELECT
          iu.user_id,
          COUNT(*) FILTER (WHERE t.grade = 'rookie' AND tur.place = 1)::int AS rookie_wins,
          COUNT(*) FILTER (WHERE t.grade = 'challenger' AND tur.place = 1)::int AS challenger_wins,
          COUNT(*) FILTER (WHERE t.grade = 'pro' AND tur.place = 1)::int AS pro_wins,
          COUNT(*) FILTER (WHERE t.grade = 'elite' AND tur.place = 1)::int AS elite_wins,
          COUNT(*) FILTER (WHERE t.grade = 'masters' AND tur.place = 1)::int AS masters_wins,
          COUNT(*) FILTER (WHERE t.grade = 'grand_slam' AND tur.place = 1)::int AS grand_slam_wins
        FROM input_users iu
        LEFT JOIN tournament_user_results tur
          ON tur.user_id = iu.user_id
        LEFT JOIN tournaments t
          ON t.id = tur.tournament_id
         AND t.state = 'finished'
         AND t.grade != 'open'
        GROUP BY iu.user_id
      ),
      tournaments_stats_achievement AS (
        SELECT
          tsr.user_id,
          'tournaments_stats'::text AS type,
          jsonb_build_object(
            'rookie_wins', tsr.rookie_wins,
            'challenger_wins', tsr.challenger_wins,
            'pro_wins', tsr.pro_wins,
            'elite_wins', tsr.elite_wins,
            'masters_wins', tsr.masters_wins,
            'grand_slam_wins', tsr.grand_slam_wins
          ) AS meta
        FROM tournaments_stats_raw tsr
      ),
      ordered_games AS (
        SELECT
          ug.user_id,
          ug.result,
          ROW_NUMBER() OVER (PARTITION BY ug.user_id ORDER BY ug.inserted_at, ug.id) AS rn_all
        FROM user_games ug
        INNER JOIN input_users iu
          ON iu.user_id = ug.user_id
      ),
      won_runs AS (
        SELECT
          og.user_id,
          og.rn_all - ROW_NUMBER() OVER (PARTITION BY og.user_id ORDER BY og.rn_all) AS grp
        FROM ordered_games og
        WHERE og.result = 'won'
      ),
      streak_sizes AS (
        SELECT
          wr.user_id,
          COUNT(*)::int AS streak
        FROM won_runs wr
        GROUP BY wr.user_id, wr.grp
      ),
      best_streak_raw AS (
        SELECT
          ss.user_id,
          MAX(ss.streak)::int AS best_streak
        FROM streak_sizes ss
        GROUP BY ss.user_id
      ),
      best_streak_achievement AS (
        SELECT DISTINCT
          bsr.user_id,
          'best_win_streak'::text AS type,
          jsonb_build_object('count', bsr.best_streak) AS meta
        FROM best_streak_raw bsr
        WHERE bsr.best_streak > 0
      ),
      computed AS (
        SELECT * FROM game_stats_achievement
        UNION ALL
        SELECT * FROM games_achievement
        UNION ALL
        SELECT * FROM tournament_achievement
        UNION ALL
        SELECT * FROM polyglot_achievement
        UNION ALL
        SELECT * FROM highest_grade_achievement
        UNION ALL
        SELECT * FROM season_champion_achievement
        UNION ALL
        SELECT * FROM grand_slam_achievement
        UNION ALL
        SELECT * FROM tournaments_stats_achievement
        UNION ALL
        SELECT * FROM best_streak_achievement
      ),
      upserted AS (
        INSERT INTO user_achievements (user_id, type, meta, inserted_at, updated_at)
        SELECT c.user_id, c.type, c.meta, NOW(), NOW()
        FROM computed c
        ON CONFLICT (user_id, type)
        DO UPDATE SET
          meta = EXCLUDED.meta,
          updated_at = EXCLUDED.updated_at
        RETURNING user_id, type
      )
      DELETE FROM user_achievements ua
      WHERE ua.user_id = ANY($1::bigint[])
        AND ua.type = ANY($2::text[])
        AND NOT EXISTS (
          SELECT 1
          FROM computed c
          WHERE c.user_id = ua.user_id
            AND c.type = ua.type
        )
      """,
      [user_ids, types]
    )

    :ok
  end

  defp highest_milestone(count, milestones) do
    milestones
    |> Enum.filter(&(&1 <= count))
    |> List.last()
  end

  defp cast_user_id(user_id) when is_binary(user_id), do: String.to_integer(user_id)
  defp cast_user_id(user_id), do: user_id

  defp format_milestone(value) when value < 1000, do: Integer.to_string(value)

  defp format_milestone(value) do
    if rem(value, 1000) == 0 do
      "#{div(value, 1000)}k"
    else
      "#{Float.round(value / 1000, 1)}k"
    end
  end

  defp do_recalculate_all_users(offset, batch_size, processed) do
    user_ids =
      User
      |> select([u], u.id)
      |> order_by([u], asc: u.id)
      |> limit(^batch_size)
      |> offset(^offset)
      |> Repo.all()

    case user_ids do
      [] ->
        %{processed_users: processed}

      _ ->
        recalculate_many(user_ids)
        do_recalculate_all_users(offset + batch_size, batch_size, processed + length(user_ids))
    end
  end
end
