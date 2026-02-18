defmodule CodebattleWeb.BroadcastEditorController do
  use CodebattleWeb, :controller

  def index(conn, _params) do
    conn
    |> put_layout(html: {CodebattleWeb.LayoutView, :empty})
    |> render("index.html")
  end
end
