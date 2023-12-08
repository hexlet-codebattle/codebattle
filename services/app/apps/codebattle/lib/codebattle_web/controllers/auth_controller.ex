defmodule CodebattleWeb.AuthController do
  use CodebattleWeb, :controller

  import CodebattleWeb.Gettext

  require Logger

  def token(conn, params) do
    token = params |> Map.get("t", "") |> String.trim()

    case Codebattle.Oauth.User.find_by_token(token) do
      {:ok, user} ->
        url =
          :codebattle
          |> Application.get_env(:force_redirect_url)
          |> case do
            "" -> "/"
            url -> url
          end

        conn
        |> put_flash(:info, gettext("Successfully authenticated"))
        |> put_session(:user_id, user.id)
        |> redirect(to: url)

      {:error, reason} ->
        conn
        |> put_flash(:danger, reason)
        |> redirect(to: "/")
    end
  end

  def request(conn, params) do
    provider_name = params["provider"]
    # TODO: add next from request prams to callback
    redirect_uri = Routes.auth_url(conn, :callback, provider_name)

    case provider_name do
      "github" ->
        oauth_github_url = Codebattle.Oauth.Github.login_url(%{redirect_uri: redirect_uri})

        conn
        |> redirect(external: oauth_github_url)

      "discord" ->
        oauth_discord_url = Codebattle.Oauth.Discord.login_url(%{redirect_uri: redirect_uri})

        conn
        |> redirect(external: oauth_discord_url)

      _ ->
        conn
        |> redirect(to: "/")
    end
    |> halt()
  end

  def callback(conn, params = %{"code" => code}) do
    provider_name = params["provider"]

    next_path =
      case params["next"] do
        "" -> "/"
        nil -> "/"
        next -> next
      end

    case provider_name do
      "github" ->
        # TODO: user with
        {:ok, profile} = Codebattle.Oauth.Github.github_auth(code)
        Codebattle.Oauth.User.GithubUser.find_or_create(profile)

      "discord" ->
        # TODO: user with
        redirect_uri = Routes.auth_url(conn, :callback, provider_name)
        {:ok, profile} = Codebattle.Oauth.Discord.discord_auth(code, redirect_uri)
        Codebattle.Oauth.User.DiscordUser.find_or_create(profile)
    end
    |> case do
      {:ok, user} ->
        conn
        |> put_flash(:info, gettext("Successfully authenticated"))
        |> put_session(:user_id, user.id)
        |> redirect(to: next_path)

      {:error, reason} ->
        conn
        # TODO: add flash messages to landing, otherwise users wouldn't get a real error messages
        |> put_flash(:danger, inspect(reason))
        |> redirect(to: "/")
    end
  end

  def callback(conn, _params) do
    conn
    |> put_flash(:danger, "wrong callback")
    |> redirect(to: "/")
  end
end
