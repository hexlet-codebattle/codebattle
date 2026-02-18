defmodule Codebattle.Tournament.TournamentUserResult do
  @moduledoc false

  use Ecto.Schema

  import Ecto.Query

  alias Codebattle.Repo
  alias Codebattle.Tournament

  @type t :: %__MODULE__{}

  schema "tournament_user_results" do
    field(:avg_result_percent, :decimal)
    field(:clan_id, :integer)
    field(:clan_name, :string)
    field(:games_count, :integer, default: 0)
    field(:is_cheater, :boolean, default: false)
    field(:place, :integer, default: 0)
    field(:points, :integer, default: 0)
    field(:score, :integer, default: 0)
    field(:total_time, :integer, default: 0)
    field(:tournament_id, :integer)
    field(:user_id, :integer)
    field(:user_name, :string)
    field(:user_lang, :string)
    field(:wins_count, :integer, default: 0)

    timestamps(updated_at: false)
  end

  @spec get_by(pos_integer()) :: [t()]
  def get_by(tournament_id) do
    __MODULE__
    |> where([tr], tr.tournament_id == ^tournament_id)
    |> Repo.all()
  end

  @spec get_leaderboard(pos_integer(), pos_integer()) :: [t()]
  def get_leaderboard(tournament_id, limit \\ 32) do
    __MODULE__
    |> where([tr], tr.tournament_id == ^tournament_id)
    |> order_by([tr], asc: tr.place)
    |> limit(^limit)
    |> Repo.all()
  end

  @spec get_user_history(integer() | String.t(), pos_integer(), pos_integer()) :: map()
  def get_user_history(user_id, page \\ 1, page_size \\ 20) do
    __MODULE__
    |> join(:inner, [tur], t in Tournament, on: tur.tournament_id == t.id)
    |> where([tur, t], tur.user_id == ^user_id and t.state == "finished")
    |> order_by([_tur, t], desc: t.finished_at, desc: t.started_at, desc: t.id)
    |> select([tur, t], %{
      tournament_id: t.id,
      tournament_name: t.name,
      tournament_grade: t.grade,
      tournament_type: t.type,
      tournament_state: t.state,
      tournament_started_at: t.started_at,
      tournament_finished_at: t.finished_at,
      place: tur.place,
      points: tur.points,
      score: tur.score,
      games_count: tur.games_count,
      wins_count: tur.wins_count,
      total_time: tur.total_time,
      avg_result_percent: tur.avg_result_percent,
      user_lang: tur.user_lang,
      clan_name: tur.clan_name,
      is_cheater: tur.is_cheater
    })
    |> Repo.paginate(%{page: page, page_size: page_size, total: true})
  end

  @spec upsert_results(tounament :: Tournament.t() | map()) :: Tournament.t()
  def upsert_results(%{type: "swiss", ranking_type: "by_user", score_strategy: "75_percentile"} = tournament) do
    clean_results(tournament.id)

    Repo.query!("""
      WITH grade_points AS (
        SELECT 'rookie' as grade, UNNEST(ARRAY[8, 4, 2]) as points, GENERATE_SERIES(1, 3) as position
        UNION ALL
        SELECT 'challenger' as grade, UNNEST(ARRAY[16, 8, 4, 2]) as points, GENERATE_SERIES(1, 6) as position
        UNION ALL
        SELECT 'pro' as grade, UNNEST(ARRAY[128, 64, 32, 16, 8, 4, 2]) as points, GENERATE_SERIES(1, 7) as position
        UNION ALL
        SELECT 'elite' as grade, UNNEST(ARRAY[256, 128, 64, 32, 16, 8, 4, 2]) as points, GENERATE_SERIES(1, 8) as position
        UNION ALL
        SELECT 'masters' as grade, UNNEST(ARRAY[1024, 512, 256, 128, 64, 32, 16, 8, 4, 2]) as points, GENERATE_SERIES(1, 10) as position
        UNION ALL
        SELECT 'grand_slam' as grade, UNNEST(ARRAY[2048, 1024, 512, 256, 128, 64, 32, 16, 8, 4, 2]) as points, GENERATE_SERIES(1, 11) as position
      ),
      aggregated_results AS (
        SELECT
          tr.tournament_id,
          tr.user_id,
          tr.clan_id,
          MAX(tr.user_name) AS user_name,
          (
            SELECT user_lang
            FROM tournament_results tr2
            WHERE tr2.tournament_id = tr.tournament_id
              AND tr2.user_id = tr.user_id
            GROUP BY user_lang
            ORDER BY COUNT(*) DESC, user_lang DESC
            LIMIT 1
          ) AS user_lang,
          SUM(tr.score)::integer AS score,
          COUNT(*)::integer AS games_count,
          SUM(CASE WHEN tr.result_percent = 100.0 THEN 1 ELSE 0 END)::integer AS wins_count,
          SUM(tr.duration_sec)::integer AS total_time,
          BOOL_OR(tr.was_cheated) AS is_cheater,
          AVG(tr.result_percent)::numeric(5,1) AS avg_result_percent
        FROM tournament_results tr
        WHERE tr.tournament_id = #{tournament.id}
        GROUP BY tr.tournament_id, tr.user_id, tr.clan_id
      ),
      ranked_results AS (
        SELECT
          ar.tournament_id,
          ar.user_id,
          ar.clan_id,
          ar.user_name,
          ar.user_lang,
          ar.score,
          ar.games_count,
          ar.wins_count,
          ar.total_time,
          ar.is_cheater,
          ar.avg_result_percent,
          c.name AS clan_name,
          ROW_NUMBER() OVER (ORDER BY ar.score DESC, ar.total_time ASC) AS place,
          t.grade
        FROM aggregated_results ar
        JOIN tournaments t ON t.id = ar.tournament_id and t.grade != 'open'
        LEFT JOIN clans c ON c.id = ar.clan_id
      ),
      results_with_points AS (
        SELECT
          rr.tournament_id,
          rr.user_id,
          rr.clan_id,
          rr.clan_name,
          rr.user_name,
          rr.user_lang,
          rr.score,
          rr.place,
          rr.games_count,
          rr.wins_count,
          rr.total_time,
          rr.is_cheater,
          rr.avg_result_percent,
          COALESCE(gp.points, 2) AS points
        FROM ranked_results rr
        LEFT JOIN grade_points gp ON gp.grade = rr.grade AND gp.position = rr.place
      )
      INSERT INTO tournament_user_results (
        tournament_id,
        user_id,
        clan_id,
        clan_name,
        user_name,
        user_lang,
        score,
        points,
        place,
        games_count,
        wins_count,
        total_time,
        is_cheater,
        avg_result_percent,
        inserted_at
      )
      SELECT
        tournament_id,
        user_id,
        clan_id,
        clan_name,
        user_name,
        user_lang,
        score,
        points,
        place,
        games_count,
        wins_count,
        total_time,
        is_cheater,
        avg_result_percent,
        NOW()
      FROM results_with_points
      ON CONFLICT (tournament_id, user_id)
      DO UPDATE SET
        user_name = EXCLUDED.user_name,
        clan_id = EXCLUDED.clan_id,
        clan_name = EXCLUDED.clan_name,
        user_lang = EXCLUDED.user_lang,
        score = EXCLUDED.score,
        points = EXCLUDED.points,
        place = EXCLUDED.place,
        games_count = EXCLUDED.games_count,
        wins_count = EXCLUDED.wins_count,
        total_time = EXCLUDED.total_time,
        is_cheater = EXCLUDED.is_cheater,
        avg_result_percent = EXCLUDED.avg_result_percent
    """)

    tournament
  end

  def clean_results(tournament_id) do
    __MODULE__
    |> where([tr], tr.tournament_id == ^tournament_id)
    |> Repo.delete_all()
  end
end
