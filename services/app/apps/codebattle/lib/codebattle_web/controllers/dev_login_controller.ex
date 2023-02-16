defmodule CodebattleWeb.DevLoginController do
  use CodebattleWeb, :controller

  def create(conn, _params) do
    # TODO: add new flag for dev-sign-in
    if Application.get_env(:codebattle, :html_debug_mode) do
      params = %{
        name: "Dev-#{:rand.uniform(100_0000)}",
        email: "Dev@#{:rand.uniform(100_0000)}.cb",
        avatar_url: "/assets/images/logo.svg"
      }

      case Codebattle.Oauth.User.create_dev_user(params) do
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
