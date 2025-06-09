defmodule CodebattleWeb.Tournament.StreamController do
  use CodebattleWeb, :controller

  import PhoenixGon.Controller

  alias Codebattle.Tournament
  alias Codebattle.Tournament.Helpers

  def show(conn, params) do
    tournament = Tournament.Context.get!(params["id"])

    if Helpers.can_moderate?(tournament, conn.assigns.current_user) do
      conn
      |> put_view(CodebattleWeb.TournamentView)
      |> put_meta_tags(%{title: "Stream Tournament"})
      |> put_gon(tournament_id: String.to_integer(params["id"]))
      |> render("stream.html")
    else
      conn
      |> put_status(:not_found)
      |> json(%{error: "NOT_FOUND"})
      |> halt()
    end
  end
end
