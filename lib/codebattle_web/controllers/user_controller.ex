defmodule CodebattleWeb.UserController do
  use CodebattleWeb, :controller

  alias Codebattle.Repo
  alias Codebattle.User

  plug(CodebattleWeb.Plugs.RequireAuth when action in [:index])

  def index(conn, _params) do
    query = Ecto.Query.from(users in User, order_by: [desc: users.rating])
    users = Repo.all(query)
    render(conn, "index.html", users: users)
  end

  def show(conn, %{"id" => user_id}) do
    user = Repo.get!(User, user_id)
    render(conn, "show.html", user: user)
  end
end
