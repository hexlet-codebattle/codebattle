defmodule CodebattleWeb.AuthController do
  use CodebattleWeb, :controller
  import CodebattleWeb.Gettext

  require Logger
  alias Ueberauth.Strategy.Helpers

  plug(Ueberauth)

  def request(conn, _params) do
    render(conn, "request.html", callback_url: Helpers.callback_url(conn))
  end

  def callback(%{assigns: %{ueberauth_failure: reason}} = conn, _params) do
    Logger.error("Failed to authenticate on github" + inspect(reason))

    conn
    |> put_flash(:danger, gettext("Failed to authenticate."))
    |> redirect(to: "/")
  end

  def callback(%{assigns: %{ueberauth_auth: auth}} = conn, _params) do
    case Codebattle.GithubUser.find_or_create(auth) do
      {:ok, user} ->
        conn
        |> put_flash(:info, gettext("Successfully authenticated."))
        |> put_session(:user_id, user.id)
        |> redirect(to: "/")

      {:error, reason} ->
        conn
        |> put_flash(:danger, reason)
        |> redirect(to: "/")
    end
  end
end
