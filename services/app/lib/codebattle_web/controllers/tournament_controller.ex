defmodule CodebattleWeb.TournamentController do
  use CodebattleWeb, :controller

  alias Phoenix.LiveView

  plug(CodebattleWeb.Plugs.RequireAuth)

  def index(conn, _params) do
    LiveView.Controller.live_render(conn, CodebattleWeb.Live.TournamentView, session: %{})
  end
end
