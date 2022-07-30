defmodule CodebattleWeb.AuthController do
  use CodebattleWeb, :controller
  import CodebattleWeb.Gettext

  require Logger

  def token(conn, params) do
    case Codebattle.Oauth.User.find_by_token(params["t"]) do
      {:ok, user} ->
        conn
        |> put_flash(:info, gettext("Successfully authenticated"))
        |> put_session(:user_id, user.id)
        |> redirect(to: "/")

      {:error, reason} ->
        conn
        |> put_flash(:danger, reason)
        |> redirect(to: "/")
    end
  end

  def request(conn, params) do
    provider_name = params["provider"]

    provider_config =
      case provider_name do
        "github" ->
          {Ueberauth.Strategy.Github,
           [
             default_scope: "user:email",
             request_path: conn.request_path,
             callback_path: Routes.auth_path(conn, :callback, provider_name, next: params["next"])
           ]}

        "discord" ->
          {Ueberauth.Strategy.Discord,
           [
             default_scope: "identify email",
             request_path: conn.request_path,
             callback_path: Routes.auth_path(conn, :callback, provider_name)
           ]}
      end

    Ueberauth.run_request(conn, provider_name, provider_config)
  end

  def callback(%{assigns: %{ueberauth_failure: reason}} = conn, params) do
    Logger.error(
      "Failed to authenticate on github" <>
        inspect(reason) <> "\nParams: " <> inspect(params)
    )

    conn
    |> put_flash(:danger, gettext("Failed to authenticate."))
    |> redirect(to: "/")
  end

  def callback(%{assigns: %{ueberauth_auth: auth}} = conn, params) do
    next = params["next"]

    next_path =
      case next do
        "" -> "/"
        nil -> "/"
        _ -> next
      end

    case Codebattle.Oauth.User.find_or_create(auth) do
      {:ok, user} ->
        conn
        |> put_flash(:info, gettext("Successfully authenticated"))
        |> put_session(:user_id, user.id)
        |> redirect(to: next_path)

      {:error, reason} ->
        conn
        |> put_flash(:danger, reason)
        |> redirect(to: "/")
    end
  end

  def callback(conn, params) do
    provider_name = String.to_atom(params["provider"])

    provider_config =
      case provider_name do
        :github ->
          {Ueberauth.Strategy.Github,
           [
             default_scope: "user:email",
             request_path: conn.request_path,
             callback_path: Routes.auth_path(conn, :callback, provider_name, next: params["next"])
           ]}

        :discord ->
          {Ueberauth.Strategy.Discord,
           [
             default_scope: "identify email",
             request_path: conn.request_path,
             callback_path: Routes.auth_path(conn, :callback, provider_name)
           ]}
      end

    conn
    |> Ueberauth.run_callback(provider_name, provider_config)
    |> callback(params)
  end
end
