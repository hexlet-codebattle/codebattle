defmodule CodebattleWeb.AuthBindController do
  use CodebattleWeb, :controller
  use Gettext, backend: CodebattleWeb.Gettext

  import Ecto.Query

  alias Codebattle.Auth.Discord
  alias Codebattle.Auth.Github
  alias Codebattle.Auth.User.DiscordUser
  alias Codebattle.Auth.User.GithubUser
  alias Codebattle.Repo

  require Logger

  def request(conn, params) do
    provider_name = params["provider"]

    redirect_uri = Routes.auth_bind_url(conn, :callback, provider_name)

    case provider_name do
      "github" ->
        oauth_github_url = Github.login_url(%{redirect_uri: redirect_uri})

        conn
        |> redirect(external: oauth_github_url)
        |> halt()

      "discord" ->
        oauth_discord_url = Discord.login_url(%{redirect_uri: redirect_uri})

        conn
        |> redirect(external: oauth_discord_url)
        |> halt()

      _ ->
        conn
        |> redirect(to: "/")
        |> halt()
    end
  end

  def callback(conn, %{"code" => code} = params) do
    current_user = conn.assigns.current_user

    case_result =
      case params["provider"] do
        "github" ->
          with {:ok, profile} <- Github.github_auth(code) do
            GithubUser.bind(current_user, profile)
          end

        "discord" ->
          redirect_uri = Routes.auth_bind_url(conn, :callback, "discord")

          with {:ok, profile} <- Discord.discord_auth(code, redirect_uri) do
            DiscordUser.bind(current_user, profile)
          end
      end

    case case_result do
      {:ok, _user} ->
        conn |> put_flash(:info, gettext("Successfully updated authentication settings")) |> redirect(to: "/settings")

      {:error, reason} ->
        conn |> put_flash(:danger, inspect(reason)) |> redirect(to: "/settings")
    end
  end

  def unbind(conn, params) do
    user_id = conn.assigns.current_user.id

    case_result = Repo.transaction(fn -> unbind_user(user_id, params["provider"]) end)

    case case_result do
      {:ok, _user} ->
        conn |> put_flash(:info, gettext("Successfully unbinded authentication settings.")) |> redirect(to: "/settings")

      {:error, reason} ->
        conn |> put_flash(:danger, inspect(reason)) |> redirect(to: "/settings")
    end
  end

  defp unbind_user(user_id, provider) do
    # Serialize unlink operations for this user. Without the row lock, two
    # concurrent requests could both pass can_unlink_social?/1 and remove
    # the last two login methods at the same time.
    current_user =
      Codebattle.User
      |> where([user], user.id == ^user_id)
      |> lock("FOR UPDATE")
      |> Repo.one!()

    if Codebattle.User.can_unlink_social?(current_user) do
      current_user
      |> unbind_provider(provider)
      |> unwrap_unbind_result()
    else
      Repo.rollback(gettext("You need at least one authentication method to sign in."))
    end
  end

  defp unbind_provider(current_user, "github"), do: GithubUser.unbind(current_user)
  defp unbind_provider(current_user, "discord"), do: DiscordUser.unbind(current_user)
  defp unbind_provider(_current_user, _provider), do: {:error, gettext("Unknown authentication provider.")}

  defp unwrap_unbind_result({:ok, user}), do: user
  defp unwrap_unbind_result({:error, reason}), do: Repo.rollback(reason)
end
