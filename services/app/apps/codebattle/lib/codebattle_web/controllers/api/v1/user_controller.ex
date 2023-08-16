defmodule CodebattleWeb.Api.V1.UserController do
  use CodebattleWeb, :controller

  alias Codebattle.{Repo, User, User.Stats}
  alias CodebattleWeb.Api.UserView

  import Ecto.Query, warn: false

  def index(conn, params) do
    payload = UserView.render_rating(params)

    json(conn, payload)
  end

  def show(conn, %{"id" => id}) do
    user = Repo.get(User, id)

    json(conn, %{user: user})
  end

  def create(conn, params) do
    user_attrs = %{
      name: params["name"],
      email: params["email"],
      password: params["password"]
    }

    case Codebattle.Oauth.User.create_in_firebase(user_attrs) do
      {:ok, user} ->
        conn
        |> put_session(:user_id, user.id)
        |> json(%{status: :created})

      {:error, errors} ->
        conn
        |> put_status(:unprocessable_entity)
        |> json(%{errors: errors})
    end
  end

  def stats(conn, %{"id" => id}) do
    game_stats = Stats.get_game_stats(id)
    user = Repo.get(User, id)

    json(conn, %{stats: game_stats, user: user})
  end

  def current(conn, _) do
    current_user = conn.assigns.current_user

    json(conn, %{id: current_user.id})
  end
end
