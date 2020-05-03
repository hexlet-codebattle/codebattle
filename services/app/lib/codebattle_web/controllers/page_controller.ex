defmodule CodebattleWeb.PageController do
  use CodebattleWeb, :controller

  def index(conn, _params) do
    current_user = conn.assigns.current_user

    render(conn, "index.html", current_user: current_user)
  end

  def robots(conn, _) do
    render(conn, "robots.txt")
  end

  def sitemap(conn, _) do
    render(conn, "sitemap.xml")
  end
end
