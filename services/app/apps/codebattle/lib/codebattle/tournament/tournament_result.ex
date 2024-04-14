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
    """
      with scores as(
      SELECT
      sum(score) as score,
      user_id,
      FROM
      tournament_results
      where tournament_id = #{tournament.id}
      )
      select
      user_id as player_id,
      score,
      DENSE_RANK() OVER (ORDER BY score DESC) as place
      from scores
    """
  end

  def upsert_results(tournament) do
    """
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
      (p.player_info->>'result_percent')::numeric AS result_percent,
      (p.player_info->>'name') AS user_name,
      (p.player_info->>'clan_id')::integer AS clan_id,
      (p.player_info->>'id')::integer AS user_id,
      g.duration_sec,
      g.tournament_id,
      g.id as game_id,
      dt.percentile_95,
      dt.base_score,
      CASE
      WHEN g.duration_sec <= dt.percentile_95 THEN base_score
      ELSE base_score * (100 - (100 - 1) * ((g.duration_sec - dt.percentile_95) / dt.max_duration)) / 100.0
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
      select
      tournament_id,
      game_id,
      user_id,
      user_name,
      clan_id,
      task_id,
      COALESCE(GREATEST(result_percent,1.0) * score / 100.0, 1) as score,
      level,
      duration_sec,
      result_percent
      from stats
    """
  end
end
