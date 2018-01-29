defmodule CodebattleWeb.UserController do
  @all [:index, :show, :edit, :update]
  @critical [:edit, :update]

  use CodebattleWeb, :controller

  alias Codebattle.GameProcess.ActiveGames
  alias Codebattle.{Repo, User}
  alias Ecto.Query

  plug(CodebattleWeb.Plugs.RequireAuth when action in @all)
  plug(:check_access when action in @critical)

  def index(conn, _params) do
    query = Ecto.Query.from(users in User, order_by: [desc: users.rating])
    users = Repo.all(query)
    render(conn, "index.html", users: users)
  end

  def show(conn, %{"id" => user_id}) do

    user = Repo.get!(User, user_id)
    render(conn, "show.html", user: user)
  end

  def edit(conn, %{"id" => user_id}) do
    user = Repo.get!(User, user_id)
    changeset = User.changeset(user)
    render(conn, "edit.html", user: user, changeset: changeset)
  end

  def update(conn, %{"id" => user_id, "user" => user}) do
    old_user_data = Repo.get(User, user_id)
    changeset = Topic.changeset(old_user_data, user)

    case Repo.update(changeset) do
      {:ok, _} ->
        conn
        |> put_flash(:info, "Your profile has been updated")
        |> redirect(to: user_path(conn, :show, user_id))
      {:error, changeset} ->
        render(conn, "edit.html", user: old_user_data, changeset: changeset)
    end
  end

  defp check_access(%{params: %{"id" => user_id}} = conn, _params) do
    current_user_id = conn.assigns.current_user.id
    |> Integer.to_string

    if current_user_id == user_id do
      conn
    else
      conn
      |> put_flash(:error, "Access denied") 
      |> redirect(to: user_path(conn, :show, user_id))
      |> halt
    end
  end
end
