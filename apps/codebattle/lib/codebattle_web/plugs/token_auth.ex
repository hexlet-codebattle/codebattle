defmodule CodebattleWeb.Plugs.TokenAuth do
  @moduledoc false
  import Phoenix.Controller
  import Plug.Conn

  def init(options), do: options

  def call(conn, _) do
    key = Application.get_env(:codebattle, :api_key)
    user_key = get_key(conn)

    if key && key == user_key do
      conn
    else
      conn
      |> put_status(:unauthorized)
      |> json(%{error: "oiblz"})
      |> halt()
    end
  end

  defp get_key(conn) do
    case List.first(get_req_header(conn, "x-auth-key")) do
      nil -> conn.params["auth-key"]
      header_key -> header_key
    end
  end
end
