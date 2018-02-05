defmodule CodebattleWeb.UserController do
  @all [:index, :show]

  use CodebattleWeb, :controller

  alias Codebattle.GameProcess.ActiveGames
  alias Codebattle.{Repo, User, Game, UserGame}
  alias Ecto.Query

  plug(CodebattleWeb.Plugs.RequireAuth when action in @all)

  def index(conn, _params) do
    query = Query.from users in User, order_by: [desc: users.rating]
    users = Repo.all(query)
    render(conn, "index.html", users: users)
  end

  def show(conn, %{"id" => user_id}) do
    games = Repo.all(from games in UserGame, where: games.user_id == ^user_id)

    user = Repo.get!(User, user_id)
    render(conn, "show.html", user: user, games: games)
  end
end
