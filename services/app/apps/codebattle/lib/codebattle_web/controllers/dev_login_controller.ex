defmodule CodebattleWeb.DevLoginController do
  use CodebattleWeb, :controller

  def create(conn, params) do
    if Application.get_env(:codebattle, :dev_sign_in) do
      subscription_type = Map.get(params, "subscription_type", "free")
      prefix = subscription_type |> String.first() |> String.upcase()

      params = %{
        subscription_type: subscription_type,
        name: "#{prefix}-#{:rand.uniform(100_0000)}",
        email: "#{prefix}@#{:rand.uniform(100_0000)}.cb",
        avatar_url: "/assets/images/logo.svg"
      }

      case Codebattle.Auth.User.create_dev_user(params) do
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
