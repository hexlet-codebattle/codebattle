defmodule CodebattleWeb.TournamentController do
  use CodebattleWeb, :controller

  plug(CodebattleWeb.Plugs.RequireAuth)

  def index(conn, _params) do
    conn
    |> put_meta_tags(%{
      title: "Hexlet Codebattle Tournaments",
      description: "Create or join nice tournaments, have fun with your teammates! You can play `Frontend vs Backend` or `Ruby vs Js`",
      url: Routes.tournament_url(conn, :index)
    })
    |> live_render(CodebattleWeb.Live.Tournament.IndexView,
      session: %{
        "current_user" => conn.assigns[:current_user],
        "tournaments" => Codebattle.Tournament.all()
      }
    )
  end

  def show(conn, params) do
    tournament = Codebattle.Tournament.get!(params["id"])

    conn
    |> put_meta_tags(%{
      title: "Join tournament",
      description: "Join tournament: #{String.slice(tournament.name, 0, 100)}",
      url: Routes.tournament_url(conn, :show, tournament.id)
    })
    |> live_render(CodebattleWeb.Live.Tournament.View,
      session: %{"current_user" => conn.assigns[:current_user], "tournament" => tournament}
    )
  end
end
