defmodule CodebattleWeb.TournamentsScheduleController do
  use CodebattleWeb, :controller

  alias CodebattleWeb.NewFrontend

  require Logger

  plug(CodebattleWeb.Plugs.RequireAuth when action in [:index])
  plug(:put_layout, html: {CodebattleWeb.LayoutView, :app})

  # The new frontend shows the schedule as tabs of /tournaments; the browser keeps
  # the #tab fragment across the redirect.
  def index(conn, _) do
    if NewFrontend.enabled?(conn) do
      redirect(conn, to: Routes.tournament_path(conn, :index))
    else
      conn
      |> assign(:page_title, "Tournament schedule")
      |> assign_prop("page_title", "Tournament schedule")
      |> render_inertia("TournamentsSchedule")
    end
  end
end
