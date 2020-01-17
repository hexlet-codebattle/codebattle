defmodule CodebattleWeb.TournamentController do
  use CodebattleWeb, :controller

  alias Phoenix.LiveView

  plug(CodebattleWeb.Plugs.RequireAuth)

  def index(conn, _params) do
    LiveView.Controller.live_render(conn, CodebattleWeb.Live.Tournament.IndexView,
      session: %{
        current_user: conn.assigns[:current_user],
        tournaments: Codebattle.Tournament.all()
      }
    )
  end

  def show(conn, params) do
    tournament = Codebattle.Tournament.get!(params["id"])
    view = case tournament.type do
      "team" -> CodebattleWeb.Live.Tournament.TeamView
      _ -> CodebattleWeb.Live.Tournament.IndividualView
    end
    LiveView.Controller.live_render(conn, view,
      session: %{current_user: conn.assigns[:current_user], tournament: tournament}
    )
  end
end
