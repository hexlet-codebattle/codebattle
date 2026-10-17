defmodule CodebattleWeb.RootController do
  use CodebattleWeb, :controller

  alias Codebattle.Season
  alias Codebattle.SeasonResult
  alias Codebattle.User
  alias CodebattleWeb.Api.LobbyView
  alias CodebattleWeb.Frontend
  alias CodebattleWeb.LayoutView

  plug(:put_view, CodebattleWeb.RootView)
  plug(:put_layout, html: {LayoutView, :app})

  def index(conn, params) do
    conn = put_meta_tags(conn, Application.get_all_env(:phoenix_meta_tags))

    current_user = conn.assigns.current_user
    event_slug = Application.get_env(:codebattle, :main_event_slug)
    is_guest? = current_user.is_guest
    is_event? = event_slug not in [nil, ""]

    cond do
      FunWithFlags.enabled?(:redirect_from_lobby_to_base) ->
        path = base_path_for(current_user)

        conn
        |> redirect(to: path)
        |> halt()

      # redirect use to login page if user is guest and we are in event mode
      is_guest? && is_event? ->
        redirect(conn, to: "/session/new")

      # redirect user to event page if we are in event mode
      !is_guest? && is_event? ->
        CodebattleWeb.PublicEventController.show(conn, Map.put(params, "slug", event_slug))

      is_guest? ->
        render_landing(conn)

      true ->
        render_lobby(conn, current_user, params)
    end
  end

  # Guests outside event mode: what Codebattle is, with the current season's top five.
  defp render_landing(conn) do
    current_season = Season.get_current_season()
    leaderboard = if current_season, do: SeasonResult.get_top_users(current_season.id, 5), else: []

    conn
    |> Frontend.put_layout()
    |> render_inertia("Landing", %{
      "season" => current_season && %{name: current_season.name, year: current_season.year},
      "leaderboard" =>
        Enum.map(leaderboard, &Map.take(&1, [:place, :user_id, :user_name, :avatar_url, :user_lang, :total_points])),
      "dev_sign_in" => Application.get_env(:codebattle, :dev_sign_in, false) == true,
      "version" => LayoutView.app_short_version()
    })
  end

  defp render_lobby(conn, current_user, params) do
    %{live_tournaments: live_tournaments, season_tournaments: season_tournaments} =
      LobbyView.render_tournament_params(current_user)

    conn
    |> Frontend.put_layout()
    |> render_inertia("Lobby", %{
      "task_tags" => ["strings", "math", "hash-maps", "collections", "rest"],
      "active_games" => LobbyView.render_active_games(current_user),
      "live_tournaments" => live_tournaments,
      "season_tournaments" => season_tournaments,
      "completed_games" => [],
      "leaderboard_users" => [],
      "opponent" => opponent(params)
    })
  end

  def maintenance(conn, _) do
    render(conn, "maintenance.html")
  end

  def waiting(conn, _) do
    render(conn, "waiting.html")
  end

  def authorized(conn, _) do
    render(conn, "authorized.html")
  end

  def robots(conn, _) do
    render(conn, "robots.txt")
  end

  def sitemap(conn, _) do
    render(conn, "sitemap.xml")
  end

  defp opponent(%{"opponent_id" => id}) do
    case User.get(id) do
      nil -> nil
      user -> Map.take(user, [:id, :name, :rating, :rank])
    end
  end

  defp opponent(_params), do: nil

  defp base_path_for(user) do
    cond do
      User.admin?(user) ->
        Application.get_env(:codebattle, :base_admin_path) ||
          Application.get_env(:codebattle, :base_user_path)

      User.moderator?(user) ->
        Application.get_env(:codebattle, :base_moderator_path) ||
          Application.get_env(:codebattle, :base_user_path)

      true ->
        Application.get_env(:codebattle, :base_user_path)
    end
  end
end
