defmodule CodebattleWeb.Mcp.ApiAdapter do
  @moduledoc """
  In-process adapter to the same controller actions and scope plugs as REST.
  It preserves validation, ownership, JSON serialization, quotas and audit without
  an HTTP round-trip, forwarded credentials or a second implementation of actions.
  """
  alias Codebattle.Mcp.Oauth
  alias Codebattle.Mcp.Tools
  alias CodebattleWeb.Mcp.ResponseAdapter
  alias CodebattleWeb.PublicApi.V1.Helpers
  alias CodebattleWeb.PublicApi.V1.Snapshot
  alias Hermes.Server.Response

  def call(tool, params, identity) do
    with {:ok, auth} <- resolve_identity(identity),
         :ok <- allowed(tool, auth),
         {:ok, params} <- Tools.validate(tool, params) do
      execute(tool, params, auth)
    else
      {:error, :invalid_token} -> error("invalid_token", "The connection is no longer active")
      {:error, reason} when is_binary(reason) -> error(reason, reason)
      {:error, errors} -> error("validation_failed", Helpers.describe_errors(errors), errors)
    end
  end

  defp resolve_identity(identity) do
    Oauth.connection_auth(identity[:mcp_connection_id], identity[:mcp_user_id], identity[:mcp_scopes])
  end

  def query_params(params) do
    Map.new(params, fn {key, value} -> {key, if(is_integer(value), do: Integer.to_string(value), else: value)} end)
  end

  defp allowed(tool, auth) do
    cond do
      FunWithFlags.enabled?(:public_api_disabled) -> {:error, "api_disabled"}
      tool.admin_only? and not Codebattle.User.admin?(auth.user) -> {:error, "admin_required"}
      tool.scope not in auth.scopes -> {:error, "insufficient_scope"}
      tool.method != "GET" and FunWithFlags.enabled?(:public_api_writes_disabled) -> {:error, "api_disabled"}
      true -> :ok
    end
  end

  defp execute(%{controller: :snapshot}, _params, auth) do
    Response.structured(Response.tool(), Snapshot.hello(auth.user))
  end

  defp execute(tool, params, auth) do
    params = if tool.method == "GET", do: query_params(params), else: params

    conn = %Plug.Conn{
      adapter: {ResponseAdapter, nil},
      method: tool.method,
      params: params,
      query_params: if(tool.method == "GET", do: params, else: %{}),
      body_params: if(tool.method == "GET", do: %{}, else: params),
      private: %{phoenix_endpoint: CodebattleWeb.Endpoint, phoenix_format: "json"},
      assigns: %{current_user: auth.user, oauth_connection: auth.connection, oauth_scopes: auth.scopes}
    }

    conn = tool.controller.call(conn, tool.controller.init(tool.action))
    body = Jason.decode!(conn.resp_body)
    response = Response.structured(Response.tool(), body)
    %{response | isError: conn.status >= 400}
  end

  defp error(code, message, details \\ nil) do
    error = %{code: code, message: message}
    error = if details, do: Map.put(error, :details, details), else: error
    response = Response.structured(Response.tool(), %{error: error})
    %{response | isError: true}
  end
end
