defmodule CodebattleWeb.Tournament.PlayerController do
  use CodebattleWeb, :controller

  import PhoenixGon.Controller
  alias Codebattle.Tournament
  alias Runner.Languages

  def show(conn, params) do
    tournament = Tournament.Context.get!(params["id"])

    conn
    |> put_view(CodebattleWeb.TournamentView)
    |> put_meta_tags(%{
      title: "Tournament Player Live",
      description: "#{String.slice(tournament.name, 0, 100)}",
      url: Routes.tournament_player_url(conn, :show, tournament.id, params["player_id"])
    })
    |> put_gon(
      tournament_id: String.to_integer(params["id"]),
      player_id: String.to_integer(params["player_id"]),
      cancel_redirect_to_new_game: true,
      langs: Languages.get_langs()
    )
    |> render("player.html", layout: false)
  end
end
