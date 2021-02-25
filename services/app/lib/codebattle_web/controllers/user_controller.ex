defmodule CodebattleWeb.UserController do
  @all [:index, :show, :edit, :update]

  use CodebattleWeb, :controller

  alias Codebattle.{Repo, User, UserGame}
  import Ecto.Query

  plug(CodebattleWeb.Plugs.RequireAuth when action in @all)

  def index(conn, _params) do
    conn
    |> put_meta_tags(%{
      title: "Hexlet Codebattle • Users rating",
      description: "Top Codebattle players ever, compare your skills with other developers",
      url: Routes.user_path(conn, :index)
    })
    |> render("index.html")
  end

  def new(conn, _params) do
    render(conn, "new.html")
  end

  def show(conn, %{"id" => user_id}) do
    games = Repo.all(from(games in UserGame, where: games.user_id == ^user_id))
    stats = User.Stats.get_game_stats(user_id)
    rank = User.Stats.get_user_rank(user_id)
    user = Repo.get!(User, user_id)

    render(conn, "show.html", user: user, rank: rank, games: games, stats: stats)
  end

  def edit(conn, _params) do
    current_user = conn.assigns.current_user

    changeset = User.changeset(current_user)
    render(conn, "edit.html", user: current_user, changeset: changeset)
  end

  def update(conn, %{"user" => user_params}) do
    current_user = conn.assigns.current_user

    current_user
    |> User.settings_changeset(user_params)
    |> Repo.update()
    |> case do
      {:ok, _} ->
        conn
        |> put_flash(:info, "User was successfully updated.")
        |> redirect(to: Routes.user_setting_path(conn, :edit))

      {:error, %Ecto.Changeset{} = changeset} ->
        render(conn, "edit.html", user: current_user, changeset: changeset)
    end
  end
end
