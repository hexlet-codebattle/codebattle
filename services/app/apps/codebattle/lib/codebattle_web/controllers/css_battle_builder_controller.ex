defmodule CodebattleWeb.CssBattleBuilderController do
  use CodebattleWeb, :controller

  alias CodebattleWeb.CssBattleBuilderView

  def index(conn, _params) do
    render(conn, "app.html", layout: {CssBattleBuilderView, "app.html"})
  end
end
