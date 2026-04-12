defmodule CodebattleWeb.AuthBindController do
  use CodebattleWeb, :controller
  use Gettext, backend: CodebattleWeb.Gettext

  alias Codebattle.Auth.Discord
  alias Codebattle.Auth.Github
  alias Codebattle.Auth.User.DiscordUser
  alias Codebattle.Auth.User.GithubUser

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
    current_user = Codebattle.Repo.reload(conn.assigns.current_user)

    case_result =
      if Codebattle.User.can_unlink_social?(current_user) do
        case params["provider"] do
          "github" ->
            GithubUser.unbind(current_user)

          "discord" ->
            DiscordUser.unbind(current_user)
        end
      else
        {:error, gettext("You need at least one authentication method to sign in.")}
      end

    case case_result do
      {:ok, _user} ->
        conn |> put_flash(:info, gettext("Successfully unbinded authentication settings.")) |> redirect(to: "/settings")

      {:error, reason} ->
        conn |> put_flash(:danger, inspect(reason)) |> redirect(to: "/settings")
    end
  end
end
