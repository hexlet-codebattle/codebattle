defmodule CodebattleWeb.BroadcastEditorController do
  use CodebattleWeb, :controller

  def index(conn, _params) do
    conn
    |> put_layout("empty.html")
    |> render("index.html")
  end
end
