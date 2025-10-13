defmodule CodebattleWeb.Api.V1.TournamentController do
  use CodebattleWeb, :controller

  alias Codebattle.Tournament

  def index(conn, params) do
    current_user = conn.assigns.current_user

    filter = %{
      from: get_datetime(params["from"]) || DateTime.utc_now(),
      to: get_datetime(params["to"]) || DateTime.add(DateTime.utc_now(), 30, :day),
      user: current_user
    }

    season_tournaments = Tournament.Context.get_season_tournaments(filter)
    user_tournaments = Tournament.Context.get_user_tournaments(filter)
    json(conn, %{season_tournaments: season_tournaments, user_tournaments: user_tournaments})
  end

  defp get_datetime(nil), do: nil

  defp get_datetime(iso_datetime) do
    case DateTime.from_iso8601(iso_datetime) do
      {:ok, datetime, _} -> datetime
      {:error, _} -> nil
    end
  end
end
