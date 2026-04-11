defmodule Codebattle.Task.Stats do
  @moduledoc """
  Computes aggregate statistics for a given task:
  total games played, winners count, and solve-time percentiles.
  """

  import Ecto.Query

  alias Codebattle.Game
  alias Codebattle.Repo
  alias Codebattle.UserGame

  @spec get_stats(integer()) :: map()
  def get_stats(task_id) do
    games_count = get_games_count(task_id)
    winners_count = get_winners_count(task_id)
    percentiles = get_solve_time_percentiles(task_id)
    leaderboard = get_leaderboard(task_id)

    %{
      games_count: games_count,
      winners_count: winners_count,
      percentiles: percentiles,
      leaderboard: leaderboard
    }
  end

  defp get_games_count(task_id) do
    Repo.aggregate(from(g in Game, where: g.task_id == ^task_id and g.state == "game_over"), :count, :id)
  end

  defp get_winners_count(task_id) do
    Repo.aggregate(
      from(ug in UserGame,
        join: g in Game,
        on: ug.game_id == g.id,
        where: g.task_id == ^task_id and g.state == "game_over" and ug.result == "won"
      ),
      :count,
      :id
    )
  end

  defp get_solve_time_percentiles(task_id) do
    query = """
    SELECT
      COUNT(*) AS count,
      ROUND(PERCENTILE_CONT(0.10) WITHIN GROUP (ORDER BY g.duration_sec)::numeric, 1) AS p10,
      ROUND(PERCENTILE_CONT(0.30) WITHIN GROUP (ORDER BY g.duration_sec)::numeric, 1) AS p30,
      ROUND(PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY g.duration_sec)::numeric, 1) AS p50,
      ROUND(PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY g.duration_sec)::numeric, 1) AS p75,
      ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY g.duration_sec)::numeric, 1) AS p95
    FROM user_games ug
    JOIN games g ON ug.game_id = g.id
    WHERE g.task_id = $1
      AND g.state = 'game_over'
      AND ug.result = 'won'
      AND g.duration_sec > 0
    """

    case Repo.query(query, [task_id]) do
      {:ok, %{rows: [[count, p10, p30, p50, p75, p95]]}} when count > 0 ->
        %{
          count: count,
          p10: decimal_to_float(p10),
          p30: decimal_to_float(p30),
          p50: decimal_to_float(p50),
          p75: decimal_to_float(p75),
          p95: decimal_to_float(p95)
        }

      _ ->
        %{count: 0, p10: nil, p30: nil, p50: nil, p75: nil, p95: nil}
    end
  end

  defp get_leaderboard(task_id) do
    query = """
    SELECT
      g.id AS game_id,
      g.duration_sec,
      u.id AS user_id,
      u.name AS user_name,
      u.rating,
      ug.lang
    FROM user_games ug
    JOIN games g ON ug.game_id = g.id
    JOIN users u ON ug.user_id = u.id
    WHERE g.task_id = $1
      AND g.state = 'game_over'
      AND ug.result = 'won'
      AND g.duration_sec > 0
    ORDER BY g.duration_sec ASC
    LIMIT 10
    """

    case Repo.query(query, [task_id]) do
      {:ok, %{rows: rows}} ->
        Enum.map(rows, fn [game_id, duration_sec, user_id, user_name, rating, lang] ->
          %{
            game_id: game_id,
            duration_sec: duration_sec,
            user_id: user_id,
            user_name: user_name,
            rating: rating,
            lang: lang
          }
        end)

      _ ->
        []
    end
  end

  defp decimal_to_float(nil), do: nil
  defp decimal_to_float(%Decimal{} = d), do: Decimal.to_float(d)
  defp decimal_to_float(v) when is_float(v), do: v
  defp decimal_to_float(v) when is_integer(v), do: v * 1.0
end
