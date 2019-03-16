defmodule CodebattleWeb.DevLoginController do
  use CodebattleWeb, :controller

  def create(conn, _params) do
    if Mix.env() == :dev do
      auth = %{
        provider: :dev_local,
        name: "Diman-#{:rand.uniform(10000)}",
        email: "Diman@#{:rand.uniform(10000)}.co"
      }

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
    else
      conn
      |> put_flash(:danger, "Lol")
      |> redirect(to: "/")
    end
  end
end
