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
    __MODULE__
    |> where([sr], sr.season_id == ^season_id)
    |> order_by([sr], asc: sr.place)
    |> Repo.all()
  end

  @spec get_leaderboard(pos_integer(), pos_integer()) :: [t()]
  def get_leaderboard(season_id, limit \\ 100) do
    __MODULE__
    |> where([sr], sr.season_id == ^season_id)
    |> order_by([sr], asc: sr.place)
    |> limit(^limit)
    |> Repo.all()
  end

  @spec get_by_user(pos_integer(), pos_integer()) :: t() | nil
  def get_by_user(season_id, user_id) do
    __MODULE__
    |> where([sr], sr.season_id == ^season_id and sr.user_id == ^user_id)
    |> Repo.one()
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
        __MODULE__
        |> where([sr], sr.season_id == ^season_id)
        |> where([sr], sr.place >= ^(place - limit) and sr.place <= ^(place + limit))
        |> where([sr], sr.user_id != ^user_id)
        |> order_by([sr], asc: sr.place)
        |> Repo.all()
    end
  end

  @doc """
  Get top N users for a given season.
  """
  @spec get_top_users(pos_integer(), pos_integer()) :: [t()]
  def get_top_users(season_id, limit) do
    __MODULE__
    |> where([sr], sr.season_id == ^season_id)
    |> where([sr], sr.place >= 1 and sr.place <= ^limit)
    |> order_by([sr], asc: sr.place)
    |> Repo.all()
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
            AND t.started_at >= $2::date
            AND t.started_at <= $3::date
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
