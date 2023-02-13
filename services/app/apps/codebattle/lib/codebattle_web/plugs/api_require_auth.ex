defmodule CodebattleWeb.Plugs.ApiRequireAuth do
  import Plug.Conn
  import Phoenix.Controller

  def init(options), do: options

  def call(conn, _) do
    if conn.assigns.current_user.is_guest do
      conn
      |> put_status(:unauthorized)
      |> json(%{error: "oiblz"})
      |> halt
    else
      conn
    end
  end
end
