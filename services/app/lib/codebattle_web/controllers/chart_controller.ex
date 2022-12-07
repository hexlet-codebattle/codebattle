defmodule CodebattleWeb.ChartController do
  use CodebattleWeb, :controller

  plug(CodebattleWeb.Plugs.RequireAuth when action in [:show])

  def show(conn, _params) do
    render(conn, "show.html")
  end
end
