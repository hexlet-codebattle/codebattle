defmodule CodebattleWeb.Plugs.ApiRequireAuth do
  @moduledoc false
  import Phoenix.Controller
  import Plug.Conn

  def init(options), do: options

  def call(conn, _) do
    if conn.assigns.current_user.is_guest do
      conn
      |> put_status(:unauthorized)
      |> json(%{error: "oiblz"})
      |> halt()
    else
      conn
    end
  end
end
