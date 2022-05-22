defmodule CodebattleWeb.RootController do
  use CodebattleWeb, :controller

  def index(conn, _params) do
    current_user = conn.assigns.current_user

    case current_user.guest do
      true ->
        conn
        |> put_layout("landing.html")
        |> render("landing.html")

      _ ->
        render(conn, "index.html", current_user: current_user)
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
end
