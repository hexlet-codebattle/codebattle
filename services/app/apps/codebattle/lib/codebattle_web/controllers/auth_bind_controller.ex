defmodule CodebattleWeb.AuthBindController do
  use CodebattleWeb, :controller
  import CodebattleWeb.Gettext

  require Logger

  def request(conn, params) do
    provider_name = params["provider"]

    redirect_uri = Routes.auth_bind_url(conn, :callback, provider_name)

    case provider_name do
      "github" ->
        oauth_github_url = Codebattle.Auth.Github.login_url(%{redirect_uri: redirect_uri})

        conn
        |> redirect(external: oauth_github_url)
        |> halt()

      "discord" ->
        oauth_discord_url = Codebattle.Auth.Discord.login_url(%{redirect_uri: redirect_uri})

        conn
        |> redirect(external: oauth_discord_url)
        |> halt()

      _ ->
        conn
        |> redirect(to: "/")
        |> halt()
    end
  end

  def callback(conn, params = %{"code" => code}) do
    current_user = conn.assigns.current_user

    case params["provider"] do
      "github" ->
        {:ok, profile} = Codebattle.Auth.Github.github_auth(code)
        Codebattle.Auth.User.GithubUser.bind(current_user, profile)

      "discord" ->
        redirect_uri = Routes.auth_bind_url(conn, :callback, "discord")
        {:ok, profile} = Codebattle.Auth.Discord.discord_auth(code, redirect_uri)
        Codebattle.Auth.User.DiscordUser.bind(current_user, profile)
    end
    |> case do
      {:ok, _user} ->
        conn
        |> put_flash(:info, gettext("Successfully updated authentication settings"))
        |> redirect(to: "/settings")

      {:error, reason} ->
        conn
        |> put_flash(:danger, inspect(reason))
        |> redirect(to: "/settings")
    end
  end

  def unbind(conn, params) do
    current_user = conn.assigns.current_user

    case params["provider"] do
      "github" ->
        Codebattle.Auth.User.GithubUser.unbind(current_user)

      "discord" ->
        Codebattle.Auth.User.DiscordUser.unbind(current_user)
    end
    |> case do
      {:ok, _user} ->
        conn
        |> put_flash(:info, gettext("Successfully unbinded authentication settings."))
        |> redirect(to: "/settings")

      {:error, reason} ->
        conn
        |> put_flash(:danger, inspect(reason))
        |> redirect(to: "/settings")
    end
  end
end
