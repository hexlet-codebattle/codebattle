defmodule CodebattleWeb.UserController do
  use CodebattleWeb, :controller

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
    if Application.get_env(:codebattle, :use_only_token_auth) do
      render(conn, "token_only.html")
    else
      render(conn, "new.html")
    end
  end

  def show(conn, %{"id" => user_name}) do
    conn
    |> put_meta_tags(%{
      title: "Hexlet Codebattle Profile",
      description: "Profile codebattle user_name",
      url: Routes.user_path(conn, :show, user_name)
    })
    |> render("show.html")
  end

  def edit(conn, _params) do
    conn
    |> put_meta_tags(%{
      title: "Hexlet Codebattle • Edit",
      description: "Profile Settings",
      url: Routes.user_setting_path(conn, :edit)
    })
    |> render("edit.html")
  end
end
