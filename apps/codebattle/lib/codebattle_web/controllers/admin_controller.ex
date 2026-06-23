defmodule CodebattleWeb.AdminController do
  use CodebattleWeb, :controller

  plug(:put_view, CodebattleWeb.AdminView)
  plug(:put_layout, html: {CodebattleWeb.LayoutView, :app})

  def connections(conn, _params) do
    conn
    |> put_meta_tags(%{
      title: "Codebattle Admin Connections",
      description: "Live monitor of user socket connections"
    })
    |> render("connections.html")
  end
end
