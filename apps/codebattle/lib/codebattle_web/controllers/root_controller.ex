defmodule CodebattleWeb.RootController do
  use CodebattleWeb, :controller

  import PhoenixGon.Controller

  alias Codebattle.Season
  alias Codebattle.SeasonResult
  alias Codebattle.User
  alias CodebattleWeb.Api.LobbyView
  alias CodebattleWeb.LayoutView

  plug(:put_view, CodebattleWeb.RootView)
  plug(:put_layout, {LayoutView, "app.html"})

  def index(conn, params) do
    conn = put_meta_tags(conn, Application.get_all_env(:phoenix_meta_tags))

    current_user = conn.assigns.current_user
    event_slug = Application.get_env(:codebattle, :main_event_slug)
    is_guest? = current_user.is_guest
    is_event? = event_slug not in [nil, ""]

    cond do
      FunWithFlags.enabled?(:redirect_from_lobby_to_base) ->
        path = Application.get_env(:codebattle, :base_user_path)

        conn
        |> redirect(to: path)
        |> halt()

      # redirect use to login page if user is guest and we are in event mode
      is_guest? && is_event? ->
        redirect(conn, to: "/session/new")

      # redirect user to event page if we are in event mode
      !is_guest? && is_event? ->
        conn
        |> put_view(CodebattleWeb.PublicEventView)
        |> CodebattleWeb.PublicEventController.show(Map.put(params, "slug", event_slug))

      # render guests landing page for normal mode
      is_guest? ->
        current_season = Season.get_current_season()

        current_season_leaderboard =
          if current_season do
            SeasonResult.get_top_users(current_season.id, 5)
          else
            []
          end

        conn
        |> assign(:current_season, current_season)
        |> assign(:current_season_leaderboard, current_season_leaderboard)
        |> render("landing.html", layout: {LayoutView, "landing.html"})

      # by default render index page with lobby view
      true ->
        conn
        |> maybe_put_opponent(params)
        |> put_gon(
          task_tags: ["strings", "math", "hash-maps", "collections", "rest"],
          active_games: LobbyView.render_active_games(current_user),
          tournaments: [],
          completed_games: [],
          leaderboard_users: []
        )
        |> render("index.html")
    end
  end

  def maintenance(conn, _) do
    render(conn, "maintenance.html", layout: {LayoutView, "empty.html"})
  end

  def waiting(conn, _) do
    render(conn, "waiting.html", layout: {LayoutView, "landing.html"})
  end

  def feedback(conn, _) do
    render(conn, "feedback.xml")
  end

  def robots(conn, _) do
    render(conn, "robots.txt")
  end

  def sitemap(conn, _) do
    render(conn, "sitemap.xml")
  end

  defp maybe_put_opponent(conn, %{"opponent_id" => id}) do
    case User.get(id) do
      nil -> conn
      user -> put_gon(conn, opponent: Map.take(user, [:id, :name, :rating, :rank]))
    end
  end

  defp maybe_put_opponent(conn, _params), do: conn
end
