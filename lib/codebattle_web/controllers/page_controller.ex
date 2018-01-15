defmodule CodebattleWeb.PageController do
  use CodebattleWeb, :controller

  alias Codebattle.GameProcess.Play
  alias Codebattle.Game

  def index(conn, _params) do
    case conn.assigns[:is_authenticated?] do
      true ->
        render(conn, "list.html")
      _ ->
        render conn, "index.html"
    end
  end
end
