defmodule CodebattleWeb.TournamentsScheduleController do
  use CodebattleWeb, :controller

  require Logger

  plug(CodebattleWeb.Plugs.RequireAuth when action in [:index])

  def index(conn, _) do
    render(conn, "index.html")
  end
end
