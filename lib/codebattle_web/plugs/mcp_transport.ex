defmodule CodebattleWeb.Plugs.McpTransport do
  @moduledoc """
  HTTP boundary for Hermes. Session identifiers are signed and bound to the OAuth
  connection, so a different authenticated client cannot attach to an MCP session.
  The server does not expose a long-lived server event stream.
  """
  import Plug.Conn

  alias Codebattle.Mcp.Oauth
  alias Codebattle.Mcp.Tools
  alias CodebattleWeb.Mcp.ApiAdapter
  alias CodebattleWeb.Plugs.McpAuth
  alias CodebattleWeb.PublicApi.V1.InviteController
  alias Hermes.Server.Transport.StreamableHTTP.Plug, as: Transport

  @session_salt "mcp-transport-session"

  def init(opts), do: opts

  def call(conn, _opts) do
    cond do
      not valid_origin?(conn) -> reject(conn, 403)
      conn.method == "GET" -> conn |> put_resp_header("allow", "POST, DELETE") |> reject(405)
      conn.method not in ["POST", "DELETE"] -> reject(conn, 405)
      true -> authenticate(conn)
    end
  end

  defp authenticate(conn) do
    conn = McpAuth.call(conn, [])
    conn = if conn.halted, do: conn, else: McpAuth.authorize_tool(conn)
    conn = if conn.halted, do: conn, else: CodebattleWeb.Plugs.PublicApi.RateLimit.call(conn, [])

    if conn.halted do
      conn
    else
      case unwrap_session(conn) do
        {:ok, conn} -> prepare_dispatch(conn)
        :error -> reject(conn, 404)
      end
    end
  end

  defp prepare_dispatch(
         %{body_params: %{"method" => "tools/call", "params" => %{"name" => "list_invites", "arguments" => args}}} = conn
       ) do
    # REST's bounded long poll belongs to this HTTP request, not Hermes' shared
    # server process (whose call timeout is five seconds).
    with {:ok, args} <- Tools.validate(Tools.find("list_invites"), args),
         wait when is_integer(wait) and wait > 0 <- args["wait"] do
      InviteController.wait_for_change(conn.assigns.current_user, ApiAdapter.query_params(args))
      body = put_in(conn.body_params, ["params", "arguments", "wait"], 0)
      conn = %{conn | body_params: body}
      conn = McpAuth.call(conn, [])
      if conn.halted, do: conn, else: dispatch(conn)
    else
      _ -> dispatch(conn)
    end
  end

  defp prepare_dispatch(conn), do: dispatch(conn)

  defp dispatch(conn) do
    connection_id = conn.assigns.oauth_connection.id

    conn =
      register_before_send(conn, fn conn ->
        case get_resp_header(conn, "mcp-session-id") do
          [session_id] ->
            signed = Phoenix.Token.sign(CodebattleWeb.Endpoint, @session_salt, {connection_id, session_id})
            put_resp_header(conn, "mcp-session-id", signed)

          _ ->
            conn
        end
      end)

    # Hermes carries request context into its server process. Keep credentials and
    # private account fields out of that context (including crash reports).
    transport_conn = %{
      conn
      | assigns: %{
          mcp_user_id: conn.assigns.current_user.id,
          mcp_connection_id: conn.assigns.oauth_connection.id,
          mcp_scopes: conn.assigns.oauth_scopes
        }
    }

    transport_conn = delete_req_header(transport_conn, "authorization")
    Transport.call(transport_conn, Transport.init(server: Codebattle.Mcp.Server))
  end

  defp unwrap_session(conn) do
    case get_req_header(conn, "mcp-session-id") do
      [] ->
        {:ok, conn}

      [signed] ->
        case Phoenix.Token.verify(CodebattleWeb.Endpoint, @session_salt, signed, max_age: 86_400) do
          {:ok, {connection_id, session_id}} when connection_id == conn.assigns.oauth_connection.id ->
            {:ok, put_req_header(conn, "mcp-session-id", session_id)}

          _ ->
            :error
        end

      _ ->
        :error
    end
  end

  defp valid_origin?(conn) do
    case get_req_header(conn, "origin") do
      [] -> true
      [origin] -> origin in Application.get_env(:codebattle, :mcp_allowed_origins, [Oauth.issuer()])
      _ -> false
    end
  end

  defp reject(conn, status), do: conn |> send_resp(status, "") |> halt()
end
