defmodule CodebattleWeb.UserController do
  use CodebattleWeb, :controller

  import PhoenixGon.Controller

  alias Codebattle.{Repo, User, UserGame}
  alias CodebattleWeb.Api.UserView
  import Ecto.Query

  def index(conn, _params) do
    %{users: users} =
      UserView.render_rating(%{
        "page_size" => "20",
        "page" => "1",
        "s" => "rank+asc",
        "date_from" => "",
        "with_bots" => false
      })

    conn
    |> put_meta_tags(%{
      title: "Hexlet Codebattle • Users rating",
      description: "Top Codebattle players ever, compare your skills with other developers",
      url: Routes.user_path(conn, :index)
    })
    |> put_gon(users_rating: users)
    |> render("index.html")
  end

  def new(conn, _params) do
    if Application.get_env(:codebattle, :use_only_token_auth) do
      render(conn, "token_only.html")
    else
      render(conn, "new.html")
    end
  end

  def show(conn, %{"id" => user_id}) do
    games = Repo.all(from(games in UserGame, where: games.user_id == ^user_id))
    stats = User.Stats.get_game_stats(user_id)
    user = Repo.get!(User, user_id)

    current_user = conn.assigns.current_user

    profile_title =
      if current_user.id === String.to_integer(user_id) do
        "My Profile"
      else
        "#{user.name} Profile"
      end

    conn
    |> put_meta_tags(%{
      title: "Hexlet Codebattle • #{profile_title}",
      description: "Profile codebattle player: #{user.name}",
      url: Routes.user_path(conn, :show, user.id)
    })
    |> render("show.html", user: user, games: games, stats: stats)
  end

  def edit(conn, _params) do
    current_user = conn.assigns.current_user
    changeset = User.changeset(current_user)

    profile_title =
      if current_user.is_guest do
        "Profile Settings"
      else
        "My Settings"
      end

    conn
    |> put_meta_tags(%{
      title: "Hexlet Codebattle • #{profile_title}",
      description: "Profile Settings",
      url: Routes.user_setting_path(conn, :edit)
    })
    |> render("edit.html", user: current_user, changeset: changeset)
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
