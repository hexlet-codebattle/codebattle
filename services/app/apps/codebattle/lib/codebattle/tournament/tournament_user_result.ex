defmodule Codebattle.Tournament.TournamentUserResult do
  @moduledoc false

  use Ecto.Schema

  import Ecto.Query

  alias Codebattle.Repo
  alias Codebattle.Tournament

  @type t :: %__MODULE__{}

  schema "tournament_user_results" do
    field(:user_id, :integer)
    field(:clan_id, :integer)
    field(:user_name, :string)
    field(:score, :integer, default: 0)
    field(:tournament_id, :integer)
    field(:points, :integer, default: 0)
    field(:place, :integer, default: 0)
    field(:games_count, :integer, default: 0)
    field(:wins_count, :integer, default: 0)
    field(:total_time, :integer, default: 0)
    field(:is_cheater, :boolean, default: false)
    field(:avg_result_percent, :decimal)

    timestamps(updated_at: false)
  end

  def get_by(tournament_id) do
    __MODULE__
    |> where([tr], tr.tournament_id == ^tournament_id)
    |> Repo.all()
  end

  @spec upsert_results(tounament :: Tournament.t() | map()) :: Tournament.t()
  def upsert_results(%{type: type, ranking_type: "by_user", score_strategy: "75_percentile"} = tournament)
      when type in ["swiss", "arena", "top200"] do
    clean_results(tournament.id)

    Repo.query!("""
      WITH grade_points AS (
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
      aggregated_results AS (
        SELECT
          tr.tournament_id,
          tr.user_id,
          tr.clan_id,
          tr.user_name,
          SUM(tr.score)::integer AS score,
          COUNT(*)::integer AS games_count,
          SUM(CASE WHEN tr.result_percent = 100.0 THEN 1 ELSE 0 END)::integer AS wins_count,
          SUM(tr.duration_sec)::integer AS total_time,
          BOOL_OR(tr.was_cheated) AS is_cheater,
          AVG(tr.result_percent)::numeric(5,1) AS avg_result_percent
        FROM tournament_results tr
        WHERE tr.tournament_id = #{tournament.id}
        GROUP BY tr.tournament_id, tr.user_id, tr.clan_id, tr.user_name
      ),
      ranked_results AS (
        SELECT
          ar.tournament_id,
          ar.user_id,
          ar.clan_id,
          ar.user_name,
          ar.score,
          ar.games_count,
          ar.wins_count,
          ar.total_time,
          ar.is_cheater,
          ar.avg_result_percent,
          ROW_NUMBER() OVER (ORDER BY ar.score DESC, ar.total_time ASC) AS place,
          t.grade
        FROM aggregated_results ar
        JOIN tournaments t ON t.id = ar.tournament_id
      ),
      results_with_points AS (
        SELECT
          rr.tournament_id,
          rr.user_id,
          rr.clan_id,
          rr.user_name,
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
        user_name,
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
        user_name,
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
