defmodule Codebattle.SeasonResult do
  @moduledoc """
  Schema and context for season results
  Aggregates tournament user results for users within a season
  """

  use Ecto.Schema

  import Ecto.Changeset
  import Ecto.Query

  alias Codebattle.Repo
  alias Codebattle.Season

  @type t :: %__MODULE__{}

  @derive {Jason.Encoder,
           only: [
             :id,
             :season_id,
             :user_id,
             :user_name,
             :user_lang,
             :avatar_url,
             :clan_id,
             :clan_name,
             :place,
             :total_points,
             :total_score,
             :tournaments_count,
             :total_games_count,
             :total_wins_count,
             :avg_place,
             :best_place,
             :total_time,
             :inserted_at
           ]}

  schema "season_results" do
    belongs_to(:season, Season)
    field(:user_id, :integer)
    field(:user_name, :string)
    field(:user_lang, :string)
    field(:avatar_url, :string, virtual: true)
    field(:clan_id, :integer)
    field(:clan_name, :string)
    field(:place, :integer, default: 0)
    field(:total_points, :integer, default: 0)
    field(:total_score, :integer, default: 0)
    field(:tournaments_count, :integer, default: 0)
    field(:total_games_count, :integer, default: 0)
    field(:total_wins_count, :integer, default: 0)
    field(:avg_place, :decimal)
    field(:best_place, :integer)
    field(:total_time, :integer, default: 0)

    timestamps(updated_at: false)
  end

  @spec get_by_season(pos_integer()) :: [t()]
  def get_by_season(season_id) do
    Repo.all(
      from(sr in __MODULE__,
        left_join: u in Codebattle.User,
        on: u.id == sr.user_id,
        where: sr.season_id == ^season_id,
        order_by: [asc: sr.place],
        select: %{sr | avatar_url: u.avatar_url}
      )
    )
  end

  @spec get_leaderboard(pos_integer(), pos_integer()) :: [t()]
  def get_leaderboard(season_id, limit \\ 100) do
    Repo.all(
      from(sr in __MODULE__,
        left_join: u in Codebattle.User,
        on: u.id == sr.user_id,
        where: sr.season_id == ^season_id,
        order_by: [asc: sr.place],
        limit: ^limit,
        select: %{sr | avatar_url: u.avatar_url}
      )
    )
  end

  @spec get_by_user(pos_integer(), pos_integer()) :: t() | nil
  def get_by_user(season_id, user_id) do
    Repo.one(
      from(sr in __MODULE__,
        left_join: u in Codebattle.User,
        on: u.id == sr.user_id,
        where: sr.season_id == ^season_id and sr.user_id == ^user_id,
        select: %{sr | avatar_url: u.avatar_url}
      )
    )
  end

  @doc """
  Get nearby users for a given user in a season's leaderboard.
  Returns users within `limit` positions above and below the given user's place.
  """
  @spec get_nearby_users(pos_integer(), pos_integer(), pos_integer()) :: [t()]
  def get_nearby_users(season_id, user_id, limit \\ 2) do
    case get_by_user(season_id, user_id) do
      nil ->
        []

      %{place: place} ->
        Repo.all(
          from(sr in __MODULE__,
            left_join: u in Codebattle.User,
            on: u.id == sr.user_id,
            where: sr.season_id == ^season_id,
            where: sr.place >= ^(place - limit) and sr.place <= ^(place + limit),
            where: sr.user_id != ^user_id,
            order_by: [asc: sr.place],
            select: %{sr | avatar_url: u.avatar_url}
          )
        )
    end
  end

  @doc """
  Get top N users for a given season.
  """
  @spec get_top_users(pos_integer(), pos_integer()) :: [t()]
  def get_top_users(season_id, limit) do
    Repo.all(
      from(sr in __MODULE__,
        left_join: u in Codebattle.User,
        on: u.id == sr.user_id,
        where: sr.season_id == ^season_id,
        where: sr.place >= 1 and sr.place <= ^limit,
        order_by: [asc: sr.place],
        select: %{sr | avatar_url: u.avatar_url}
      )
    )
  end

  @spec get_by_user_history(pos_integer()) :: [map()]
  def get_by_user_history(user_id) do
    Repo.all(
      from(sr in __MODULE__,
        join: s in Season,
        on: s.id == sr.season_id,
        where: sr.user_id == ^user_id,
        order_by: [desc: s.year, desc: s.starts_at],
        select: %{
          season_id: s.id,
          season_name: s.name,
          season_year: s.year,
          season_starts_at: s.starts_at,
          season_ends_at: s.ends_at,
          place: sr.place,
          total_points: sr.total_points,
          total_score: sr.total_score,
          tournaments_count: sr.tournaments_count,
          total_games_count: sr.total_games_count,
          total_wins_count: sr.total_wins_count,
          total_time: sr.total_time
        }
      )
    )
  end

  @spec aggregate_season_results(Season.t() | pos_integer()) :: {:ok, integer()} | {:error, any()}
  def aggregate_season_results(%Season{} = season) do
    aggregate_season_results(season.id)
  end

  def aggregate_season_results(season_id) when is_integer(season_id) do
    season = Season.get!(season_id)

    # Clean existing results for this season
    clean_results(season_id)

    # Aggregate tournament user results for tournaments within the season date range
    # where grade != 'open'
    result =
      Repo.query!(
        """
        WITH aggregated_data AS (
          SELECT
            $1::bigint AS season_id,
            tur.user_id,
            MAX(tur.user_name) AS user_name,
            MAX(tur.user_lang) AS user_lang,
            MAX(tur.clan_id) AS clan_id,
            MAX(c.name) AS clan_name,
            SUM(tur.points)::integer AS total_points,
            SUM(tur.score)::integer AS total_score,
            COUNT(DISTINCT tur.tournament_id)::integer AS tournaments_count,
            SUM(tur.games_count)::integer AS total_games_count,
            SUM(tur.wins_count)::integer AS total_wins_count,
            AVG(tur.place)::numeric(10,2) AS avg_place,
            MIN(tur.place)::integer AS best_place,
            SUM(tur.total_time)::integer AS total_time
          FROM tournament_user_results tur
          INNER JOIN tournaments t ON t.id = tur.tournament_id
          LEFT JOIN clans c ON c.id = tur.clan_id
          WHERE t.grade != 'open'
            AND t.state = 'finished'
            AND t.started_at::date >= $2::date
            AND t.started_at::date <= $3::date
          GROUP BY tur.user_id
        ),
        ranked_data AS (
          SELECT
            season_id,
            user_id,
            user_name,
            user_lang,
            clan_id,
            clan_name,
            total_points,
            total_score,
            tournaments_count,
            total_games_count,
            total_wins_count,
            avg_place,
            best_place,
            total_time,
            ROW_NUMBER() OVER (
              ORDER BY 
                total_points DESC,
                total_wins_count DESC,
                total_score DESC
            )::integer AS place
          FROM aggregated_data
        )
        INSERT INTO season_results (
          season_id,
          user_id,
          user_name,
          user_lang,
          clan_id,
          clan_name,
          place,
          total_points,
          total_score,
          tournaments_count,
          total_games_count,
          total_wins_count,
          avg_place,
          best_place,
          total_time,
          inserted_at
        )
        SELECT
          season_id,
          user_id,
          user_name,
          user_lang,
          clan_id,
          clan_name,
          place,
          total_points,
          total_score,
          tournaments_count,
          total_games_count,
          total_wins_count,
          avg_place,
          best_place,
          total_time,
          NOW()
        FROM ranked_data
        ON CONFLICT (season_id, user_id)
        DO UPDATE SET
          user_name = EXCLUDED.user_name,
          user_lang = EXCLUDED.user_lang,
          clan_id = EXCLUDED.clan_id,
          clan_name = EXCLUDED.clan_name,
          place = EXCLUDED.place,
          total_points = EXCLUDED.total_points,
          total_score = EXCLUDED.total_score,
          tournaments_count = EXCLUDED.tournaments_count,
          total_games_count = EXCLUDED.total_games_count,
          total_wins_count = EXCLUDED.total_wins_count,
          avg_place = EXCLUDED.avg_place,
          best_place = EXCLUDED.best_place,
          total_time = EXCLUDED.total_time
        """,
        [season_id, season.starts_at, season.ends_at]
      )

    {:ok, result.num_rows}
  rescue
    e -> {:error, e}
  end

  @spec clean_results(pos_integer()) :: {integer(), nil | [term()]}
  def clean_results(season_id) do
    __MODULE__
    |> where([sr], sr.season_id == ^season_id)
    |> Repo.delete_all()
  end

  @doc """
  Get detailed player stats for a season, including tournament breakdown by grade.
  This is an expensive query, so it should only be called on-demand for a single player.
  """
  @spec get_player_detailed_stats(pos_integer(), pos_integer()) :: map() | nil
  def get_player_detailed_stats(season_id, user_id) do
    season = Season.get!(season_id)
    season_result = get_by_user(season_id, user_id)

    case season_result do
      nil ->
        nil

      _ ->
        # Get tournament stats grouped by grade
        grade_stats = get_grade_stats(season, user_id)

        # Get recent tournament performances (last 10)
        recent_tournaments = get_recent_tournaments(season, user_id)

        # Get performance trend over tournaments
        performance_trend = get_performance_trend(season, user_id)

        %{
          season_result: season_result,
          grade_stats: grade_stats,
          recent_tournaments: recent_tournaments,
          performance_trend: performance_trend
        }
    end
  end

  @spec get_grade_stats(Season.t(), pos_integer()) :: [map()]
  defp get_grade_stats(season, user_id) do
    result =
      Repo.query!(
        """
        SELECT
          t.grade,
          COUNT(DISTINCT tur.tournament_id)::integer AS tournaments_count,
          SUM(tur.points)::integer AS total_points,
          SUM(tur.score)::integer AS total_score,
          SUM(tur.games_count)::integer AS total_games,
          SUM(tur.wins_count)::integer AS total_wins,
          MIN(tur.place)::integer AS best_place,
          AVG(tur.place)::numeric(10,2) AS avg_place,
          SUM(tur.total_time)::integer AS total_time,
          ARRAY_AGG(DISTINCT tur.place ORDER BY tur.place) FILTER (WHERE tur.place <= 3) AS podium_finishes
        FROM tournament_user_results tur
        INNER JOIN tournaments t ON t.id = tur.tournament_id
        WHERE tur.user_id = $1
          AND t.grade != 'open'
          AND t.state = 'finished'
          AND t.started_at::date >= $2::date
          AND t.started_at::date <= $3::date
        GROUP BY t.grade
        ORDER BY
          CASE t.grade
            WHEN 'grand_slam' THEN 1
            WHEN 'masters' THEN 2
            WHEN 'elite' THEN 3
            WHEN 'pro' THEN 4
            WHEN 'challenger' THEN 5
            WHEN 'rookie' THEN 6
            ELSE 7
          END
        """,
        [user_id, season.starts_at, season.ends_at]
      )

    Enum.map(result.rows, fn row ->
      %{
        grade: Enum.at(row, 0),
        tournaments_count: Enum.at(row, 1) || 0,
        total_points: Enum.at(row, 2) || 0,
        total_score: Enum.at(row, 3) || 0,
        total_games: Enum.at(row, 4) || 0,
        total_wins: Enum.at(row, 5) || 0,
        best_place: Enum.at(row, 6),
        avg_place: row |> Enum.at(7) |> to_float(),
        total_time: Enum.at(row, 8) || 0,
        podium_finishes: Enum.at(row, 9) || []
      }
    end)
  end

  @spec get_recent_tournaments(Season.t(), pos_integer()) :: [map()]
  defp get_recent_tournaments(season, user_id) do
    result =
      Repo.query!(
        """
        SELECT
          t.id AS tournament_id,
          t.name AS tournament_name,
          t.grade,
          t.started_at,
          tur.place,
          tur.points,
          tur.score,
          tur.games_count,
          tur.wins_count,
          tur.total_time,
          (SELECT COUNT(*) FROM tournament_user_results WHERE tournament_id = t.id)::integer AS total_participants
        FROM tournament_user_results tur
        INNER JOIN tournaments t ON t.id = tur.tournament_id
        WHERE tur.user_id = $1
          AND t.grade != 'open'
          AND t.state = 'finished'
          AND t.started_at::date >= $2::date
          AND t.started_at::date <= $3::date
        ORDER BY t.started_at DESC
        LIMIT 10
        """,
        [user_id, season.starts_at, season.ends_at]
      )

    Enum.map(result.rows, fn row ->
      %{
        tournament_id: Enum.at(row, 0),
        tournament_name: Enum.at(row, 1),
        grade: Enum.at(row, 2),
        started_at: Enum.at(row, 3),
        place: Enum.at(row, 4),
        points: Enum.at(row, 5),
        score: Enum.at(row, 6),
        games_count: Enum.at(row, 7),
        wins_count: Enum.at(row, 8),
        total_time: Enum.at(row, 9),
        total_participants: Enum.at(row, 10)
      }
    end)
  end

  @spec get_performance_trend(Season.t(), pos_integer()) :: [map()]
  defp get_performance_trend(season, user_id) do
    result =
      Repo.query!(
        """
        SELECT
          DATE_TRUNC('week', t.started_at)::date AS week,
          COUNT(DISTINCT tur.tournament_id)::integer AS tournaments_count,
          SUM(tur.points)::integer AS total_points,
          SUM(tur.wins_count)::integer AS total_wins,
          SUM(tur.games_count)::integer AS total_games,
          AVG(tur.place)::numeric(10,2) AS avg_place
        FROM tournament_user_results tur
        INNER JOIN tournaments t ON t.id = tur.tournament_id
        WHERE tur.user_id = $1
          AND t.grade != 'open'
          AND t.state = 'finished'
          AND t.started_at::date >= $2::date
          AND t.started_at::date <= $3::date
        GROUP BY DATE_TRUNC('week', t.started_at)
        ORDER BY week
        """,
        [user_id, season.starts_at, season.ends_at]
      )

    Enum.map(result.rows, fn row ->
      %{
        week: Enum.at(row, 0),
        tournaments_count: Enum.at(row, 1) || 0,
        total_points: Enum.at(row, 2) || 0,
        total_wins: Enum.at(row, 3) || 0,
        total_games: Enum.at(row, 4) || 0,
        avg_place: row |> Enum.at(5) |> to_float()
      }
    end)
  end

  defp to_float(nil), do: nil
  defp to_float(%Decimal{} = decimal), do: Decimal.to_float(decimal)
  defp to_float(value), do: value

  @spec changeset(t(), map()) :: Ecto.Changeset.t()
  def changeset(season_result, attrs \\ %{}) do
    season_result
    |> cast(attrs, [
      :season_id,
      :user_id,
      :user_name,
      :user_lang,
      :clan_id,
      :clan_name,
      :place,
      :total_points,
      :total_score,
      :tournaments_count,
      :total_games_count,
      :total_wins_count,
      :avg_place,
      :best_place,
      :total_time
    ])
    |> validate_required([:season_id, :user_id])
    |> unique_constraint([:season_id, :user_id])
  end
end
