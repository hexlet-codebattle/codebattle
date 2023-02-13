defmodule CodebattleWeb.AuthBindController do
  use CodebattleWeb, :controller
  import CodebattleWeb.Gettext

  require Logger

  def request(conn, params) do
    provider_name = params["provider"]

    redirect_uri = Routes.auth_bind_url(conn, :callback, provider_name)

    case provider_name do
      "github" ->
        oauth_github_url = Codebattle.Oauth.Github.login_url(%{redirect_uri: redirect_uri})

        conn
        |> redirect(external: oauth_github_url)
        |> halt()

      "discord" ->
        oauth_discord_url = Codebattle.Oauth.Discord.login_url(%{redirect_uri: redirect_uri})

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
        {:ok, profile} = Codebattle.Oauth.Github.github_auth(code)
        Codebattle.Oauth.User.GithubUser.bind(current_user, profile)

      "discord" ->
        redirect_uri = Routes.auth_bind_url(conn, :callback, "discord")
        {:ok, profile} = Codebattle.Oauth.Discord.discord_auth(code, redirect_uri)
        Codebattle.Oauth.User.DiscordUser.bind(current_user, profile)
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
        Codebattle.Oauth.User.GithubUser.unbind(current_user)

      "discord" ->
        Codebattle.Oauth.User.DiscordUser.unbind(current_user)
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
