defmodule Codebattle.Plugs.Authorization do
  @moduledoc """
    Fetch authenticated user from session
  """
  import Plug.Conn
  import Phoenix.Controller
  alias CodebattleWeb.Router.Helpers

  def init(default), do: default

  def call(conn, _) do
    user_id = get_session(conn, :current_user)
    case user_id do
      nil ->
        conn
      _ ->
        user = Codebattle.User |> Codebattle.Repo.get(user_id)
        conn
        |> assign(:user, user)
        |> assign(:is_authenticated?, user != nil)
    end
  end

  def authenticate_user(conn, _opts) do
    if Map.has_key?(conn.assigns, :user) do
      conn
    else
      conn
      |> put_flash(:danger, "You must be logged in to acces that page")
      |> redirect(to: Helpers.page_path(conn, :index))
      |> halt()
    end
  end
end
