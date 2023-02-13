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

  def live(conn, params) do
    tournament_id = params["tournament_id"]
    langs = Runner.Languages.meta() |> Map.values()

    conn
    |> put_gon(langs: langs, tournament_id: tournament_id)
    |> render("live.html")
  end

  def show(conn, params) do
    current_user = conn.assigns[:current_user]
    tournament = Tournament.Context.get!(params["id"])

    if Tournament.Helpers.can_access?(tournament, current_user, params) do
      conn
      |> put_meta_tags(%{
        title: "#{tournament.name} • Hexlet Codebattle",
        description:
          "Tournament: #{String.slice(tournament.name, 0, 100)}, type: #{tournament.type}, starts_at: #{tournament.starts_at}",
        image: Routes.tournament_image_url(conn, :show, tournament.id),
        url: Routes.tournament_url(conn, :show, tournament.id)
      })
      |> live_render(CodebattleWeb.Live.Tournament.ShowView,
        session: %{"current_user" => current_user, "tournament" => tournament}
      )
    else
      conn
      |> put_status(:not_found)
      |> put_view(CodebattleWeb.ErrorView)
      |> render("404.html", %{msg: gettext("Tournament not found")})
    end
  end
end
