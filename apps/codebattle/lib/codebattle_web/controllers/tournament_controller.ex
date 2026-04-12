defmodule CodebattleWeb.TournamentController do
  use CodebattleWeb, :controller

  import PhoenixGon.Controller

  alias Codebattle.Tournament
  alias Codebattle.Tournament.Helpers
  alias Codebattle.User

  plug(CodebattleWeb.Plugs.RequireAuth when action in [:index, :show, :edit])
  plug(:put_layout, html: {CodebattleWeb.LayoutView, :app})

  def index(conn, _params) do
    current_user = conn.assigns[:current_user]

    live_render(conn, CodebattleWeb.Live.Tournament.IndexView,
      session: %{
        "current_user" => current_user,
        "tournaments" => current_user |> Tournament.Context.list_live_and_finished() |> Enum.take(5)
      }
    )
  end

  def show(conn, params) do
    current_user = conn.assigns[:current_user]
    tournament = Tournament.Context.get!(params["id"])

    if Helpers.can_access?(tournament, current_user, params) do
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
    if Helpers.can_moderate?(tournament, current_user) do
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
    auto_redirect =
      tournament.auto_redirect_to_game ||
        FunWithFlags.enabled?(:tournament_redirect_to_latest_game)

    if auto_redirect and !User.admin?(current_user),
      do: maybe_redirect_tournament(conn, tournament, current_user, params),
      else: render_tournament(conn, tournament, params)
  end

  defp maybe_redirect_tournament(conn, tournament, current_user, params) do
    case tournament.state do
      state when state in ["active", "waiting_participants"] ->
        redirect_to_latest_game_or_tournament(conn, tournament, current_user, params)

      "finished" ->
        redirect_finished_tournament(conn, tournament)

      _ ->
        render_tournament(conn, tournament, params)
    end
  end

  defp redirect_to_latest_game_or_tournament(conn, tournament, current_user, params) do
    case Tournament.Context.get_user_latest_game_id(tournament, current_user.id) do
      nil -> render_tournament(conn, tournament, params)
      latest_game_id -> redirect(conn, to: Routes.game_path(conn, :show, latest_game_id))
    end
  end

  defp redirect_finished_tournament(conn, %{group_tournament_id: nil}) do
    redirect(conn, to: Routes.root_path(conn, :index))
  end

  defp redirect_finished_tournament(conn, tournament) do
    redirect(conn, to: Routes.group_tournament_path(conn, :show, tournament.group_tournament_id))
  end

  defp render_tournament(conn, tournament, params) do
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
