defmodule CodebattleWeb.TournamentController do
  use CodebattleWeb, :controller

  import PhoenixGon.Controller

  alias Codebattle.Tournament

  def index(conn, _params) do
    current_user = conn.assigns[:current_user]

    conn
    |> put_meta_tags(%{
      title: "Hexlet Codebattle • Tournaments",
      description:
        "Create or join nice tournaments, have fun with your teammates! You can play `Frontend vs Backend` or `Ruby vs Js`",
      url: Routes.tournament_url(conn, :index)
    })
    |> live_render(CodebattleWeb.Live.Tournament.IndexView,
      session: %{
        "current_user" => current_user,
        "tournaments" => Tournament.Context.list_live_and_finished(current_user)
      }
    )
  end

  def admin(conn, params) do
    current_user = conn.assigns[:current_user]
    tournament = Tournament.Context.get!(params["id"])

    if Tournament.Helpers.can_access?(tournament, current_user, params) do
      conn
      |> put_view(CodebattleWeb.TournamentView)
      |> put_meta_tags(%{
        title: "Hexlet Codebattle • Join tournament",
        description: "Join tournament: #{String.slice(tournament.name, 0, 100)}",
        image: Routes.tournament_image_url(conn, :show, tournament.id),
        url: Routes.tournament_url(conn, :show, tournament.id)
      })
      |> put_gon(tournament_id: params["id"])
      |> put_gon(event_id: tournament.event_id)
      |> render("show.html")
    else
      conn
      |> put_status(:not_found)
      |> put_view(CodebattleWeb.ErrorView)
      |> render("404.html", %{msg: gettext("Tournament not found")})
    end
  end

  def show(conn, params) do
    current_user = conn.assigns[:current_user]
    tournament = Tournament.Context.get!(params["id"])

    if Tournament.Helpers.can_access?(tournament, current_user, params) do
      conn
      |> put_view(CodebattleWeb.TournamentView)
      |> put_meta_tags(%{
        title: "Hexlet Codebattle • Join tournament",
        description: "Join tournament: #{String.slice(tournament.name, 0, 100)}",
        image: Routes.tournament_image_url(conn, :show, tournament.id),
        url: Routes.tournament_url(conn, :show, tournament.id)
      })
      |> put_gon(tournament_id: params["id"])
      |> put_gon(event_id: tournament.event_id)
      |> render("show.html")
    else
      conn
      |> put_status(:not_found)
      |> put_view(CodebattleWeb.ErrorView)
      |> render("404.html", %{msg: gettext("Tournament not found")})
    end
  end
end
