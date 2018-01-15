defmodule CodebattleWeb.PageController do
  use CodebattleWeb, :controller

  alias Codebattle.GameProcess.Play
  alias Codebattle.Game

  def index(conn, _params) do
   current_user = conn.assigns.current_user
    case current_user.guest do
      true ->
        render conn, "index.html"
      false ->
        render conn, "list.html"
    end
  end
end
