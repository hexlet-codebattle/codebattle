defmodule CodebattleWeb.TournamentsScheduleController do
  use CodebattleWeb, :controller

  plug(CodebattleWeb.Plugs.RequireAuth when action in [:index])

  # The schedule is a tab of /tournaments; the browser keeps the #tab fragment across the redirect.
  def index(conn, _) do
    redirect(conn, to: Routes.tournament_path(conn, :index))
  end
end
