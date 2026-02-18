defmodule CodebattleWeb.Tournament.PlayerController do
  use CodebattleWeb, :controller

  import PhoenixGon.Controller

  alias Codebattle.Tournament
  alias Codebattle.User
  alias Runner.Languages

  def show(conn, params) do
    user = User.get!(params["player_id"])

    tournament = Tournament.Context.get!(params["id"])

    conn
    |> put_view(CodebattleWeb.TournamentView)
    |> put_meta_tags(%{
      title: "#{user.name} Live",
      description: "#{String.slice(tournament.name, 0, 100)}",
      url: Routes.tournament_player_url(conn, :show, tournament.id, params["player_id"])
    })
    |> put_gon(
      tournament_id: String.to_integer(params["id"]),
      player_id: String.to_integer(params["player_id"]),
      cancel_redirect_to_new_game: true,
      langs: Languages.get_langs()
    )
    |> render("player.html", layout: {CodebattleWeb.LayoutView, "empty.html"})
  end
end
