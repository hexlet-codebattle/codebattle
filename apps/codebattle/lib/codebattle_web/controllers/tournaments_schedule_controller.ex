defmodule CodebattleWeb.TournamentsScheduleController do
  use CodebattleWeb, :controller

  require Logger

  plug(CodebattleWeb.Plugs.RequireAuth when action in [:index])
  plug(:put_layout, html: {CodebattleWeb.LayoutView, :app})

  def index(conn, _) do
    conn
    |> assign(:page_title, "Tournament schedule")
    |> assign_prop("page_title", "Tournament schedule")
    |> render_inertia("TournamentsSchedule")
  end
end
