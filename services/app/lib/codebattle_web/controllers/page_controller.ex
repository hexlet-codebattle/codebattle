defmodule CodebattleWeb.PageController do
  use CodebattleWeb, :controller

  alias Codebattle.UsersActivityServer

  def index(conn, _params) do
    current_user = conn.assigns.current_user

    UsersActivityServer.add_event(%{
      event: "show_lobby_page",
      user_id: current_user.id
    })

    render(conn, "index.html", current_user: current_user)
  end

  def robots(conn, _) do
    render(conn, "robots.txt")
  end

  def sitemap(conn, _) do
    render(conn, "sitemap.xml")
  end
end
