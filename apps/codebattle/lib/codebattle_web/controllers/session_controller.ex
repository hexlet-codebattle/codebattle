defmodule CodebattleWeb.SessionController do
  use CodebattleWeb, :controller

  alias Codebattle.User

  plug(:put_view, CodebattleWeb.SessionView)
  plug(:put_layout, html: {CodebattleWeb.LayoutView, :app})

  def external_signup(conn, _params) do
    conn = put_meta_tags(conn, Application.get_all_env(:phoenix_meta_tags))

    if FunWithFlags.enabled?(:use_only_external_oauth) do
      render(conn, "external_signup.html", layout: {CodebattleWeb.LayoutView, :external})
    else
      redirect(conn, to: "/session/new")
    end
  end

  def new(conn, _params) do
    conn = put_meta_tags(conn, Application.get_all_env(:phoenix_meta_tags))

    cond do
      FunWithFlags.enabled?(:use_only_external_oauth) ->
        render(conn, "external_oauth.html", layout: {CodebattleWeb.LayoutView, :external})

      FunWithFlags.enabled?(:use_only_token_auth) ->
        render(conn, "token_only.html")

      FunWithFlags.enabled?(:use_local_password_auth) ->
        render(conn, "local_password.html", layout: {CodebattleWeb.LayoutView, :empty})

      true ->
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
