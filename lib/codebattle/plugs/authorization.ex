defmodule Codebattle.Plugs.Authorization do
  @moduledoc """
  Fetch authenticated user from session
  """
  import Plug.Conn
  import Phoenix.Controller
  import CodebattleWeb.Gettext
  import PhoenixGon.Controller

  alias CodebattleWeb.Router.Helpers

  def init(default), do: default

  def call(conn, _) do
    user_id = get_session(conn, :current_user)
    case user_id do
      nil -> conn
      _ -> put_user_data(conn, user_id)
    end
  end

  def authenticate_user(conn, _opts) do
    if Map.has_key?(conn.assigns, :user) do
      conn
    else
      conn
      |> put_flash(:danger, gettext "You must be logged in to access that page")
      |> redirect(to: Helpers.page_path(conn, :index))
      |> halt()
    end
  end

  defp put_user_data(conn, user_id) do
    user = Codebattle.User |> Codebattle.Repo.get(user_id)
    conn = assign(conn, :user, user)
    case user do
      nil ->
        assign(conn, :is_authenticated?, false)
      _ ->
        user_token = Phoenix.Token.sign(conn, "user_token", user_id)
        conn = put_gon(conn, user_token: user_token, user_id: user_id)
        assign(conn, :is_authenticated?, true)
    end
  end
end
