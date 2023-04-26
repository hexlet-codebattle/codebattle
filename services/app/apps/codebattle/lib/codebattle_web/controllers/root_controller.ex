defmodule CodebattleWeb.RootController do
  use CodebattleWeb, :controller

  import PhoenixGon.Controller

  alias Codebattle.Repo
  alias Codebattle.User

  def index(conn, params) do
    current_user = conn.assigns.current_user
    app_version = Application.get_env(:codebattle, :app_version)

    case current_user.is_guest do
      true ->
        conn
        |> put_layout("landing.html")
        |> render("landing.html")

      _ ->
        conn
        |> maybe_put_opponent(params)
        |> put_gon(task_tags: ["strings", "math", "hash-maps", "collections", "rest"])
        |> render("index.html", current_user: current_user, app_version: app_version)
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
