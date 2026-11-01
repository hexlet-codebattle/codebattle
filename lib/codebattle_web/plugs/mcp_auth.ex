defmodule CodebattleWeb.Plugs.McpAuth do
  @moduledoc "Authenticates every MCP HTTP request; browser cookies and API tokens are not MCP credentials."
  import Plug.Conn

  alias Codebattle.Mcp.Oauth
  alias Codebattle.Mcp.Tools

  def init(opts), do: opts

  def call(conn, _opts) do
    conn = put_resp_header(conn, "cache-control", "no-store")

    with false <- FunWithFlags.enabled?(:public_api_disabled),
         ["Bearer " <> raw] <- get_req_header(conn, "authorization"),
         {:ok, auth} <- Oauth.authenticate(raw) do
      conn
      |> assign(:current_user, auth.user)
      |> assign(:oauth_connection, auth.connection)
      |> assign(:oauth_scopes, auth.scopes)
    else
      true -> reject(conn, 503, "temporarily_unavailable")
      _ -> reject(conn, 401, "invalid_token")
    end
  end

  def require_scope(conn, scope) do
    if scope in conn.assigns.oauth_scopes do
      conn
    else
      conn
      |> put_resp_header("www-authenticate", challenge("insufficient_scope", scope))
      |> reject(403, "insufficient_scope")
    end
  end

  def authorize_tool(%{body_params: %{"method" => "tools/call", "params" => %{"name" => name}}} = conn) do
    case Tools.find(name) do
      nil -> conn
      tool -> authorize_operation(conn, tool)
    end
  end

  def authorize_tool(conn), do: conn

  defp authorize_operation(conn, tool) do
    conn = require_scope(conn, tool.scope)

    cond do
      conn.halted ->
        conn

      tool.method != "GET" and FunWithFlags.enabled?(:public_api_writes_disabled) ->
        reject(conn, 503, "temporarily_unavailable")

      true ->
        conn
    end
  end

  defp reject(conn, 401, error) do
    conn
    |> put_resp_header("www-authenticate", challenge(error, "read"))
    |> respond(401, error)
  end

  defp reject(conn, status, error), do: respond(conn, status, error)

  defp respond(conn, status, error) do
    conn
    |> put_resp_content_type("application/json")
    |> send_resp(status, Jason.encode!(%{error: error}))
    |> halt()
  end

  defp challenge(error, scope) do
    ~s(Bearer error="#{error}", resource_metadata="#{Oauth.issuer()}/.well-known/oauth-protected-resource/mcp", scope="#{scope}")
  end
end
