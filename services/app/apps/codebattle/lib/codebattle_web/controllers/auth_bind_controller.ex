defmodule CodebattleWeb.AuthBindController do
  use CodebattleWeb, :controller
  import CodebattleWeb.Gettext

  require Logger

  def request(conn, params) do
    provider_name = params["provider"]

    provider_config =
      case provider_name do
        "github" ->
          {Ueberauth.Strategy.Github,
           [
             default_scope: "user:email",
             request_path: conn.request_path,
             callback_path: Routes.auth_bind_path(conn, :callback, provider_name)
           ]}

        "discord" ->
          {Ueberauth.Strategy.Discord,
           [
             default_scope: "identify email",
             request_path: conn.request_path,
             callback_path: Routes.auth_bind_path(conn, :callback, provider_name)
           ]}
      end

    conn
    |> Ueberauth.run_request(provider_name, provider_config)
  end

  def callback(%{assigns: %{ueberauth_failure: reason}} = conn, params) do
    Logger.error(
      "Failed to authenticate on github" <>
        inspect(reason) <> "\nParams: " <> inspect(params)
    )

    conn
    |> put_flash(:danger, gettext("Failed to update authentication settings."))
    |> redirect(to: "/")
  end

  def callback(%{assigns: %{ueberauth_auth: auth}} = conn, params) do
    next = params["next"]
    user = conn.assigns.current_user

    next_path =
      case next do
        "" -> "/"
        nil -> "/"
        _ -> next
      end

    case Codebattle.Oauth.User.update(user, auth) do
      {:ok, _user} ->
        conn
        |> put_flash(:info, gettext("Successfully updated authentication settings."))
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
             callback_path: Routes.auth_bind_path(conn, :callback, provider_name)
           ]}

        :discord ->
          {Ueberauth.Strategy.Discord,
           [
             default_scope: "identify email",
             request_path: conn.request_path,
             callback_path: Routes.auth_bind_path(conn, :callback, provider_name)
           ]}
      end

    conn
    |> Ueberauth.run_callback(provider_name, provider_config)
    |> callback(params)
  end

  def unbind(conn, params) do
    provider_name = String.to_existing_atom(params["provider"])

    case Codebattle.Oauth.User.unbind(conn.assigns.current_user, provider_name) do
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
