defmodule CodebattleWeb.RootController do
  use CodebattleWeb, :controller

  import PhoenixGon.Controller

  alias Codebattle.Repo
  alias Codebattle.User
  alias CodebattleWeb.Api.LobbyView
  alias CodebattleWeb.Api.UserView
  alias CodebattleWeb.LayoutView

  def index(conn, params) do
    current_user = conn.assigns.current_user

    case current_user.is_guest do
      true ->
        render(conn, "landing.html", layout: {LayoutView, "landing.html"})

      _ ->
        %{
          active_games: active_games,
          tournaments: tournaments,
          completed_games: completed_games
        } = LobbyView.render_lobby_params(current_user)

        start_of_the_week =
          DateTime.utc_now()
          |> Date.beginning_of_week(:saturday)
          |> Date.to_iso8601()

        %{users: leaderboard_users} =
          UserView.render_rating(%{
            "page_size" => "7",
            "page" => "1",
            "s" => "rank+desc",
            "date_from" => start_of_the_week,
            "with_bots" => false
          })

        conn
        |> maybe_put_opponent(params)
        |> put_gon(
          task_tags: ["strings", "math", "hash-maps", "collections", "rest"],
          active_games: active_games,
          tournaments: tournaments,
          completed_games: completed_games,
          leaderboard_users: leaderboard_users
        )
        |> render("index.html", current_user: current_user)
    end
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
    case Repo.get(User, id) do
      nil -> conn
      user -> put_gon(conn, opponent: Map.take(user, [:id, :name, :rating, :rank]))
    end
  end

  defp maybe_put_opponent(conn, _params), do: conn
end
