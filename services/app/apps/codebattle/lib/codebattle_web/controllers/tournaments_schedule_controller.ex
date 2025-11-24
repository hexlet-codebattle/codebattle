defmodule CodebattleWeb.TournamentsScheduleController do
  use CodebattleWeb, :controller

  require Logger

  plug(CodebattleWeb.Plugs.RequireAuth when action in [:index])
  plug(:put_view, CodebattleWeb.TournamentsScheduleView)
  plug(:put_layout, {CodebattleWeb.LayoutView, "app.html"})

  def index(conn, _) do
    render(conn, "index.html")
  end
end
