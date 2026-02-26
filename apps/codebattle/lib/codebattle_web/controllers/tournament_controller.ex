defmodule CodebattleWeb.TournamentController do
  use CodebattleWeb, :controller

  import PhoenixGon.Controller

  alias Codebattle.Tournament
  alias Codebattle.User

  plug(CodebattleWeb.Plugs.RequireAuth when action in [:index, :show, :edit])
  plug(:put_layout, html: {CodebattleWeb.LayoutView, :app})

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
      handle_tournament_for_user(conn, tournament, current_user, params)
    else
      conn
      |> put_status(:not_found)
      |> put_view(CodebattleWeb.ErrorView)
      |> render("404.html", %{msg: gettext("Tournament not found")})
    end
  end

  def edit(conn, %{"id" => id}) do
    current_user = conn.assigns[:current_user]
    tournament = Tournament.Context.get!(id)

    # Check if user has permission to edit
    if tournament.creator_id == current_user.id || User.admin?(current_user) do
      user_timezone = get_in(conn.private, [:connect_params, "timezone"]) || "UTC"

      task_pack_names =
        current_user
        |> Codebattle.TaskPack.list_visible()
        |> Enum.map(& &1.name)

      conn
      |> put_view(CodebattleWeb.TournamentView)
      |> put_meta_tags(%{
        title: "Edit #{tournament.name}",
        description: "Edit tournament settings"
      })
      |> render("edit.html",
        tournament: tournament,
        task_pack_names: task_pack_names,
        user_timezone: user_timezone
      )
    else
      conn
      |> put_flash(:error, gettext("You don't have permission to edit this tournament"))
      |> redirect(to: Routes.tournament_path(conn, :show, id))
    end
  end

  defp handle_tournament_for_user(conn, tournament, current_user, params) do
    if FunWithFlags.enabled?(:tournament_redirect_to_latest_game) and !User.admin?(current_user) do
      latest_game_id = Tournament.Context.get_user_latest_game_id(tournament, current_user.id)

      if latest_game_id do
        redirect(conn, to: Routes.game_path(conn, :show, latest_game_id))
      else
        redirect(conn,
          to:
            Routes.tournament_path(
              conn,
              :show,
              tournament.id,
              tournament_access_params(params)
            )
        )
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
      |> put_gon(tournament_access_token: params["access_token"])
      |> render("show.html")
    end
  end

  defp tournament_access_params(%{"access_token" => access_token}) when is_binary(access_token) do
    [access_token: access_token]
  end

  defp tournament_access_params(_params), do: []
end
