defmodule CodebattleWeb.RootController do
  use CodebattleWeb, :controller

  import PhoenixGon.Controller

  alias Codebattle.User
  alias CodebattleWeb.Api.LobbyView
  alias CodebattleWeb.LayoutView

  def index(conn, params) do
    current_user = conn.assigns.current_user
    event_slug = Application.get_env(:codebattle, :lobby_event_slug)

    case {current_user.is_guest, event_slug not in [nil, ""]} do
      # redirect use to login page if user is guest and we are in event mode
      {true, true} ->
        redirect(conn, to: "/session/new")

      # redirect user to event page if we are in event mode
      {false, true} ->
        conn
        |> put_view(CodebattleWeb.PublicEventView)
        |> CodebattleWeb.PublicEventController.show(Map.put(params, "slug", event_slug))

      # render guests landing page for normal mode
      {true, _} ->
        render(conn, "landing.html", layout: {LayoutView, "landing.html"})

      # by default render index page with lobby view
      _ ->
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
