defmodule Codebattle.Mcp.Server do
  @moduledoc "MCP access to the Public API. Authentication is refreshed on every HTTP request."
  use Hermes.Server,
    name: "Codebattle",
    version: "1.1.0",
    capabilities: [:tools]

  alias Codebattle.Mcp.Tools
  alias CodebattleWeb.Mcp.ApiAdapter
  alias Hermes.MCP.Error
  alias Hermes.Server.Response

  @impl true
  def handle_request(%{"method" => "tools/list"}, frame) do
    user_auth =
      Codebattle.Mcp.Oauth.connection_auth(
        frame.assigns[:mcp_connection_id],
        frame.assigns[:mcp_user_id],
        frame.assigns[:mcp_scopes]
      )

    user =
      case user_auth do
        {:ok, auth} -> auth.user
        _ -> nil
      end

    tools =
      Tools.all()
      |> Enum.reject(&(&1.admin_only? and (is_nil(user) or not Codebattle.User.admin?(user))))
      |> Enum.map(fn tool ->
        %{
          "name" => tool.name,
          "description" => tool.description,
          "inputSchema" => tool.schema,
          "annotations" => %{
            "readOnlyHint" => tool.method == "GET",
            "destructiveHint" => tool.method != "GET",
            "idempotentHint" => tool.method == "GET",
            "openWorldHint" => false
          }
        }
      end)

    {:reply, %{"tools" => tools}, frame}
  end

  def handle_request(%{"method" => "tools/call", "params" => %{"name" => name} = params}, frame) do
    case Tools.find(name) do
      nil ->
        {:error, Error.protocol(:invalid_params, %{message: "Unknown tool"}), frame}

      tool ->
        response = ApiAdapter.call(tool, Map.get(params, "arguments", %{}), frame.assigns)
        {:reply, Response.to_protocol(response), frame}
    end
  end
end
