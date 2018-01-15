defmodule CodebattleWeb.AuthController do
  use CodebattleWeb, :controller
  import CodebattleWeb.Gettext

  alias Ueberauth.Strategy.Helpers

  plug Ueberauth

  def request(conn, _params) do
    render(conn, "request.html", callback_url: Helpers.callback_url(conn))
  end

  def logout(conn, _params) do
    conn
    |> put_flash(:info, gettext "You have been logged out!")
    |> configure_session(drop: true)
    |> redirect(to: "/")
  end

  def callback(%{assigns: %{ueberauth_failure: _fails}} = conn, _params) do
    conn
    |> put_flash(:danger, gettext "Failed to authenticate.")
    |> redirect(to: "/")
  end

  def callback(%{assigns: %{ueberauth_auth: auth}} = conn, _params) do
    case Codebattle.GithubUser.find_or_create(auth) do
      {:ok, user} ->
        conn
        |> put_flash(:info, gettext "Successfully authenticated.")
        |> put_session(:current_user, user.id)
        |> redirect(to: "/")
      {:error, reason} ->
        conn
        |> put_flash(:danger, reason)
        |> redirect(to: "/")
    end
  end
end
