defmodule CodebattleWeb.DevLoginController do
  use CodebattleWeb, :controller

  alias CodebattleWeb.UserAuth

  def create(conn, params) do
    if Application.get_env(:codebattle, :dev_sign_in) do
      subscription_type = Map.get(params, "subscription_type", "free")
      prefix = subscription_type |> String.first() |> String.upcase()

      params = %{
        subscription_type: subscription_type,
        clan: "Hexlet",
        category: "Vibecoder",
        name: "#{prefix}-#{:rand.uniform(1_000_000)}",
        email: "#{prefix}@#{:rand.uniform(1_000_000)}.cb",
        avatar_url: "/assets/images/logo.svg"
      }

      case Codebattle.Auth.User.create_dev_user(params) do
        {:ok, user} ->
          conn
          |> UserAuth.log_in_user(user)
          |> put_flash(:success, gettext("Successfully authenticated."))
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
