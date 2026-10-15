defmodule CodebattleWeb.PublicApi.DocsControllerTest do
  use CodebattleWeb.ConnCase, async: true

  @spec_path Path.expand("../../../../priv/openapi/public_api_v1.json", __DIR__)

  defp operations do
    @spec_path
    |> File.read!()
    |> Jason.decode!()
    |> Map.fetch!("paths")
    |> Enum.flat_map(fn {path, methods} -> Enum.map(Map.keys(methods), &{String.upcase(&1), path}) end)
  end

  test "every public API route is in the OpenAPI spec" do
    documented = MapSet.new(operations())

    routes =
      for %{path: "/public_api/v1/" <> rest, verb: verb} <- Phoenix.Router.routes(CodebattleWeb.Router),
          # the event leaderboard predates the token API and lives in its own pipeline
          rest != "openapi.json" and not String.starts_with?(rest, "events/") do
        {verb |> to_string() |> String.upcase(), "/" <> String.replace(rest, ":id", "{id}")}
      end

    assert routes != []
    assert routes -- MapSet.to_list(documented) == []
  end

  test "markdown documents every operation", %{conn: conn} do
    conn = get(conn, "/api-docs.md")
    markdown = response(conn, 200)

    assert conn |> get_resp_header("content-type") |> hd() =~ "text/markdown"
    assert markdown =~ "# Codebattle Public API v1"
    assert markdown =~ "## Objects"

    for {method, path} <- operations() do
      assert markdown =~ "### #{method} #{path}\n"
    end
  end

  test "html page renders endpoints with anchors", %{conn: conn} do
    html = conn |> get("/api-docs") |> html_response(200)

    assert html =~ ~s(<h3 class="endpoint" id="get-me-games">)
    assert html =~ ~s(<span class="method m-patch">PATCH</span><code class="path">/tournaments/{id}</code>)
    assert html =~ ~s(href="/api-docs.md")
    refute html =~ "<h3 id=\"get-"
  end

  test "llms.txt points to the markdown docs", %{conn: conn} do
    assert conn |> get("/llms.txt") |> response(200) =~ "/api-docs.md"
  end
end
