defmodule CodebattleWeb.UserController do
  @all [:index, :show]

  use CodebattleWeb, :controller

  alias Codebattle.{Repo, User, UserGame}
  import Ecto.Query

  plug(CodebattleWeb.Plugs.RequireAuth when action in @all)

  def index(conn, _params) do
    query = from(users in User, order_by: [desc: users.rating], preload: [:user_games])
    users = Repo.all(query)
    render(conn, "index.html", users: users)
  end

  def show(conn, %{"id" => user_id}) do
    games = Repo.all(from(games in UserGame, where: games.user_id == ^user_id))

    user = Repo.get!(User, user_id)
    render(conn, "show.html", user: user, games: games)
  end
end
