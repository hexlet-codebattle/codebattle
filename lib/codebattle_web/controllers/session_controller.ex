defmodule CodebattleWeb.SessionController do
  use CodebattleWeb, :controller

  alias Codebattle.User
  alias CodebattleWeb.AuthPage
  alias CodebattleWeb.UserAuth

  plug(:put_view, CodebattleWeb.SessionView)
  plug(:put_layout, html: {CodebattleWeb.LayoutView, :app})

  def external_signup(conn, _params) do
    conn = put_meta_tags(conn, Application.fetch_env!(:codebattle, :meta_tags))

    if FunWithFlags.enabled?(:use_only_external_oauth) do
      render(conn, "external_signup.html")
    else
      redirect(conn, to: "/session/new")
    end
  end

  def new(%{assigns: %{current_user: %{is_guest: false}}} = conn, params) do
    redirect(conn, to: AuthPage.safe_next(params["next"]))
  end

  def new(conn, _params) do
    conn = put_meta_tags(conn, Application.fetch_env!(:codebattle, :meta_tags))

    # The external / local-password pages embed admin-provided HTML (with scripts), so they
    # stay server-rendered on the bare app layout; the rest is the Auth page.
    cond do
      FunWithFlags.enabled?(:use_only_external_oauth) ->
        render(conn, "external_oauth.html")

      FunWithFlags.enabled?(:use_only_token_auth) ->
        AuthPage.render(conn, "token_only")

      FunWithFlags.enabled?(:use_local_password_auth) ->
        render(conn, "local_password.html")

      true ->
        AuthPage.render(conn, "sign_in")
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
        |> UserAuth.log_in_user(user)
        |> put_flash(:info, gettext("Welcome to Codebattle!"))
        |> redirect(to: "/")
    end
  end

  def create(conn, _params), do: redirect(conn, to: "/session/new")

  def delete(conn, _params) do
    conn
    |> put_flash(:info, gettext("You have been logged out!"))
    |> UserAuth.log_out_user()
    |> redirect(to: "/")
  end

  def remind_password(conn, _params) do
    AuthPage.render(conn, "reset_password")
  end
end
