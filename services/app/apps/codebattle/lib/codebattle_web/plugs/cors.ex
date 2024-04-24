defmodule CodebattleWeb.Plugs.CORSPlug do
  import Plug.Conn

  def init(opts), do: opts

  def call(conn, _opts) do
    conn
    # |> put_resp_header("access-control-allow-origin", "*")
    # |> put_resp_header(
    #   "access-control-allow-methods",
    #   "GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD"
    # )
    # |> put_resp_header(
    #   "access-control-allow-headers",
    #   "content-type, authorization, x-requested-with"
    # )
    # |> put_resp_header("access-control-max-age", "86400")
  end
end
