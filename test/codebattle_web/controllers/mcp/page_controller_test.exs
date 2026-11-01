defmodule CodebattleWeb.Mcp.PageControllerTest do
  use CodebattleWeb.ConnCase, async: true

  import Inertia.Testing

  alias Codebattle.Mcp.Oauth
  alias Codebattle.Mcp.Tools

  test "renders the promo page for browsers, guests included", %{conn: conn} do
    conn = conn |> put_req_header("accept", "text/html") |> get("/mcp")

    assert inertia_component(conn) == "Mcp"
    assert %{"server_url" => server_url, "tool_count" => tool_count} = inertia_props(conn)
    assert server_url == Oauth.resource()
    assert tool_count == length(Tools.all())
    assert get_resp_header(conn, "vary") == ["X-Inertia, Accept"]
  end

  test "keeps 405 for protocol GETs", %{conn: conn} do
    conn = conn |> put_req_header("accept", "text/event-stream") |> get("/mcp")

    assert response(conn, 405) == ""
    assert get_resp_header(conn, "allow") == ["POST, DELETE"]
    assert get_resp_header(conn, "vary") == ["Accept"]
  end
end
