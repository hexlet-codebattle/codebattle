defmodule Codebattle.Tournament.TournamentResult do
  @moduledoc false

  alias Codebattle.Repo

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
    |> where([tr: tr], tr.tournament_id == ^tournament_id)
    |> Repo.all()
  end

  def get_player_results(tournament) do
    score_query =
      __MODULE__
      |> where([tr], tr.tournament_id == ^tournament.id)
      |> group_by([tr], tr.user_id)
      |> select([tr], %{player_id: tr.user_id, score: sum(tr.score)})

    from(subquery(score_query))
    |> select(
      [s],
      %{
        player_id: s.player_id,
        score: s.score,
        place: fragment("dense_rank() OVER (ORDER BY ? DESC)", s.score)
      }
    )
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

  def upsert_results(tournament) do
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
      PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_sec DESC) AS percentile_95
      FROM
      games g
      where tournament_id = #{tournament.id}
      and state = 'game_over'
      GROUP BY
      task_id, level),
      stats as (
      select
      (p.player_info->'result_percent')::numeric AS result_percent,
      (p.player_info->'id')::integer AS user_id,
      (p.player_info->'name') AS user_name,
      (p.player_info->'clan_id')::integer AS clan_id,
      g.duration_sec,
      g.tournament_id,
      g.id as game_id,
      dt.percentile_95,
      dt.base_score,
      CASE
      WHEN g.duration_sec <= dt.percentile_95 THEN base_score
      WHEN g.duration_sec >= dt.max_duration THEN base_score * 0.3
      ELSE base_score * (0.3 + 0.7 * (g.duration_sec - dt.max_duration) / (dt.percentile_95 - dt.max_duration))
      END AS score,
      g.level,
      g.task_id,
      g.id
      from games g
      CROSS JOIN LATERAL
      jsonb_array_elements(g.players) AS p(player_info)
      inner join  duration_percentile_for_tasks dt
      on dt.task_id = g.task_id
      where g.tournament_id = #{tournament.id}
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
  end
end
