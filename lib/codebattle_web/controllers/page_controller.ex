defmodule CodebattleWeb.PageController do
  use Codebattle.Web, :controller


  def index(conn, _params) do
    render conn, "index.html"
  end
end
