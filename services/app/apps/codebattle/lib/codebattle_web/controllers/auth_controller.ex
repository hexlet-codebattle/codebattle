defmodule CodebattleWeb.AuthController do
  use CodebattleWeb, :controller
  use Gettext, backend: CodebattleWeb.Gettext

  alias Codebattle.Auth.Discord
  alias Codebattle.Auth.Github

  require Logger

  def token(conn, params) do
    token = params |> Map.get("t", "") |> String.trim()

    case Codebattle.Auth.User.find_by_token(token) do
      {:ok, user} ->
        url = Application.get_env(:codebattle, :force_redirect_url, "/")

        url =
          if url in [nil, ""] do
            "/"
          else
            url
          end

        Logger.info("Redirecting to #{url}")

        conn
        |> put_flash(:info, gettext("Successfully authenticated"))
        |> put_session(:user_id, user.id)
        |> redirect(to: url)

      {:error, reason} ->
        Logger.error("Failed to authenticate user: #{inspect(reason)}")

        if url = Application.get_env(:codebattle, :guest_user_force_redirect_url) do
          redirect(conn, external: url)
        else
          conn
          |> put_flash(:danger, reason)
          |> redirect(to: "/")
        end
    end
  end

  def request(conn, params) do
    provider_name = params["provider"]
    # TODO: add next from request prams to callback
    redirect_uri = Routes.auth_url(conn, :callback, provider_name)

    case_result =
      case provider_name do
        "github" ->
          oauth_github_url = Github.login_url(%{redirect_uri: redirect_uri})

          redirect(conn, external: oauth_github_url)

        "discord" ->
          oauth_discord_url = Discord.login_url(%{redirect_uri: redirect_uri})

          redirect(conn, external: oauth_discord_url)

        _ ->
          redirect(conn, to: "/")
      end

    halt(case_result)
  end

  def callback(conn, %{"code" => code} = params) do
    provider_name = params["provider"]

    next_path =
      case params["next"] do
        "" -> "/"
        nil -> "/"
        next -> next
      end

    case_result =
      case provider_name do
        "github" ->
          {:ok, profile} = Github.github_auth(code)
          Codebattle.Auth.User.GithubUser.find_or_create(profile)

        "discord" ->
          redirect_uri = Routes.auth_url(conn, :callback, provider_name)
          {:ok, profile} = Discord.discord_auth(code, redirect_uri)
          Codebattle.Auth.User.DiscordUser.find_or_create(profile)
      end

    case case_result do
      {:ok, user} ->
        conn
        |> put_flash(:info, gettext("Successfully authenticated"))
        |> put_session(:user_id, user.id)
        |> redirect(to: next_path)

      {:error, reason} ->
        conn |> put_flash(:danger, inspect(reason)) |> redirect(to: "/")
    end

    # TODO: add flash messages to landing, otherwise users wouldn't get a real error messages
  end

  def callback(conn, _params) do
    conn
    |> put_flash(:danger, "wrong callback")
    |> redirect(to: "/")
  end
end
