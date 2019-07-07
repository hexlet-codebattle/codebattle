defmodule CodebattleWeb.TournamentController do
  use CodebattleWeb, :controller

  alias Codebattle.{Repo, User, UserGame}
  import Ecto.Query

  plug(CodebattleWeb.Plugs.RequireAuth)

  def index(conn, _params) do
    render(conn, "index.html")
  end
end
