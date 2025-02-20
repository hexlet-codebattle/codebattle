defmodule CodebattleWeb.SessionController do
  use CodebattleWeb, :controller

  alias Codebattle.User

  def new(conn, _params) do
    cond do
      Application.get_env(:codebattle, :use_only_token_auth) ->
        render(conn, "token_only.html")

      Application.get_env(:codebattle, :use_local_password_auth) ->
        render(conn, "local_password.html")

      :default ->
        render(conn, "index.html")
    end
  end

  def create(conn, %{"session" => %{"name" => name, "password" => password}})
      when is_binary(name) and is_binary(password) do
    case User.authenticate(name, password) do
      nil ->
        conn
        |> put_flash(:danger, gettext("Invalid name or password"))
        |> redirect(to: "/session/new")

      user ->
        conn
        |> put_flash(:info, gettext("Welcome to Codebattle!"))
        |> put_session(:user_id, user.id)
        |> redirect(to: "/")
    end
  end

  def create(conn, _params), do: render(conn, "index.html")

  def delete(conn, _params) do
    conn
    |> put_flash(:info, gettext("You have been logged out!"))
    |> configure_session(drop: true)
    |> redirect(to: "/")
  end

  def remind_password(conn, _params) do
    render(conn, "index.html")
  end
end
