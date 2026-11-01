defmodule CodebattleWeb.Mcp.PageController do
  use CodebattleWeb, :controller

  alias Codebattle.Mcp.Oauth
  alias Codebattle.Mcp.Tools
  alias CodebattleWeb.Frontend

  def show(conn, _params) do
    conn
    |> put_meta_tags(%{
      title: "Codebattle MCP · Play from your AI assistant",
      description: "Find coding challenges, start games and organize tournaments from your AI assistant.",
      url: Oauth.resource()
    })
    |> Frontend.put_layout()
    |> render_inertia("Mcp", %{"server_url" => Oauth.resource(), "tool_count" => length(Tools.all())})
  end
end
