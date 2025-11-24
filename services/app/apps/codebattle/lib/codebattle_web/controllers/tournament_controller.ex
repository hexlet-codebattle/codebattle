defmodule CodebattleWeb.TournamentController do
  use CodebattleWeb, :controller

  import PhoenixGon.Controller

  alias Codebattle.Tournament
  alias Codebattle.User

  plug(CodebattleWeb.Plugs.RequireAuth when action in [:index, :show])
  plug(:put_layout, {CodebattleWeb.LayoutView, "app.html"})

  def index(conn, _params) do
    current_user = conn.assigns[:current_user]

    live_render(conn, CodebattleWeb.Live.Tournament.IndexView,
      session: %{
        "current_user" => current_user,
        "tournaments" => Tournament.Context.list_live_and_finished(current_user)
      }
    )
  end

  def show(conn, params) do
    current_user = conn.assigns[:current_user]
    tournament = Tournament.Context.get!(params["id"])

    if Tournament.Helpers.can_access?(tournament, current_user, params) do
      handle_tournament_for_user(conn, tournament, current_user)
    else
      conn
      |> put_status(:not_found)
      |> put_view(CodebattleWeb.ErrorView)
      |> render("404.html", %{msg: gettext("Tournament not found")})
    end
  end

  defp handle_tournament_for_user(conn, tournament, current_user) do
    if FunWithFlags.enabled?(:tournament_redirect_to_latest_game) and !User.admin?(current_user) do
      latest_game_id = Tournament.Context.get_user_latest_game_id(tournament, current_user.id)

      if latest_game_id do
        redirect(conn, to: Routes.game_path(conn, :show, latest_game_id))
      else
        redirect(conn, to: Routes.tournament_path(conn, :show, tournament.id))
      end
    else
      conn
      |> put_view(CodebattleWeb.TournamentView)
      |> put_meta_tags(%{
        title: tournament.name,
        description: tournament.description,
        image: Routes.tournament_image_url(conn, :show, tournament.id),
        url: Routes.tournament_url(conn, :show, tournament.id)
      })
      |> put_gon(tournament_id: tournament.id)
      |> put_gon(event_id: tournament.event_id)
      |> render("show.html")
    end
  end
end
