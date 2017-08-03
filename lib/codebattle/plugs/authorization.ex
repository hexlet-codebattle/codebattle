defmodule Codebattle.Plugs.Authorization do
  @moduledoc """
    Fetch authenticated user from session
  """
  import Plug.Conn
  import Ecto.Query

  def init(default), do: default

  def call(conn, _) do
    user_id = get_session(conn, :current_user)
    case user_id do
      nil ->
        conn

      _ ->
        user = CodebattleWeb.User |> Codebattle.Repo.get(user_id)
        conn
          |> assign(:user, user)
          |> assign(:is_authenticated?, user != nil)
    end
  end
end
