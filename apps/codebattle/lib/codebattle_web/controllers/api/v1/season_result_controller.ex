defmodule CodebattleWeb.Api.V1.SeasonResultController do
  @moduledoc """
  API controller for season results - provides detailed player statistics
  """

  use CodebattleWeb, :controller

  alias Codebattle.SeasonResult

  @doc """
  Get detailed player stats for a season.
  This includes tournament breakdown by grade, recent tournaments, and performance trends.

  GET /api/v1/seasons/:season_id/players/:user_id/stats
  """
  def player_stats(conn, %{"season_id" => season_id, "user_id" => user_id}) do
    season_id = String.to_integer(season_id)
    user_id = String.to_integer(user_id)

    case SeasonResult.get_player_detailed_stats(season_id, user_id) do
      nil ->
        conn
        |> put_status(:not_found)
        |> json(%{error: "Player not found in this season"})

      stats ->
        json(conn, stats)
    end
  rescue
    Ecto.NoResultsError ->
      conn
      |> put_status(:not_found)
      |> json(%{error: "Season not found"})
  end
end
