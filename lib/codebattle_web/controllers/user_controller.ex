defmodule CodebattleWeb.UserController do
  use Codebattle.Web, :controller

  alias Codebattle.Repo
  alias Codebattle.User

  plug :authenticate_user when action in [:index]

  def index(conn, _params) do
    query = Ecto.Query.from users in User, order_by: [desc: users.rating]
    users = Repo.all(query)
    render(conn, "index.html", users: users)
  end
end
