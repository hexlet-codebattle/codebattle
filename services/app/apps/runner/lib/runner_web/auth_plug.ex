defmodule RunnerWeb.AuthPlug do
  import Plug.Conn
  import Phoenix.Controller

  def init(options), do: options

  def call(conn, _) do
    if Application.get_env(:runner, :executor)[:api_key] ==
         List.first(get_req_header(conn, "x-auth-key")) do
      conn
    else
      conn
      |> put_status(:unauthorized)
      |> json(%{error: "oiblz"})
      |> halt
    end
  end
end
