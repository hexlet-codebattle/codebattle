defmodule CodebattleWeb.PageController do
  use CodebattleWeb, :controller

  alias Codebattle.{Repo, Game}
  alias Ecto.Query

  def index(conn, _params) do
    current_user = conn.assigns.current_user
    render(conn, "index.html", current_user: current_user)
  end
end
