defmodule CodebattleWeb.Plugs.McpBrowserRequest do
  @moduledoc "Serve the MCP promo page only for explicit HTML navigation; protocol GETs retain HTTP 405."
  import Plug.Conn

  def init(opts), do: opts

  def call(conn, _opts) do
    if Enum.any?(get_req_header(conn, "accept"), &String.contains?(&1, "text/html")) do
      register_before_send(conn, &vary_on_accept/1)
    else
      conn
      |> vary_on_accept()
      |> put_resp_header("allow", "POST, DELETE")
      |> send_resp(:method_not_allowed, "")
      |> halt()
    end
  end

  # Inertia later replaces Vary with its own X-Inertia, so add Accept as the response goes out.
  defp vary_on_accept(conn) do
    put_resp_header(conn, "vary", Enum.join(get_resp_header(conn, "vary") ++ ["Accept"], ", "))
  end
end
