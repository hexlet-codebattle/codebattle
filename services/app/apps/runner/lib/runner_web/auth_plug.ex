defmodule RunnerWeb.AuthPlug do
  import Plug.Conn
  import Phoenix.Controller

  def init(options), do: options

  def call(conn, _) do
    case get_req_header(conn, "x-auth-key") do
      ["x-key"] ->
        conn

      _ ->
        conn
        |> put_status(:unauthorized)
        |> json(%{error: "oiblz"})
        |> halt
    end
  end
end
