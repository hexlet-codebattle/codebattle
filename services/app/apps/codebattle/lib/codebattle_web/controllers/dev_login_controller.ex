defmodule CodebattleWeb.DevLoginController do
  use CodebattleWeb, :controller

  def create(conn, _params) do
    # TODO: add new flag for dev-sign-in
    if Application.get_env(:codebattle, :html_debug_mode) do
      params = %{
        name: "Diman-#{:rand.uniform(100_000)}",
        email: "Diman@#{:rand.uniform(100_000)}.cb"
      }

      case Codebattle.Oauth.User.find_or_create_dev_user(params) do
        {:ok, user} ->
          conn
          |> put_flash(:info, gettext("Successfully authenticated."))
          |> put_session(:user_id, user.id)
          |> redirect(to: "/")

        {:error, reason} ->
          conn
          |> put_flash(:danger, inspect(reason))
          |> redirect(to: "/")
      end
    else
      conn
      |> put_flash(:danger, "Lol")
      |> redirect(to: "/")
    end
  end
end
