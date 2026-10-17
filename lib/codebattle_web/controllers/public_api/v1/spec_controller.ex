defmodule CodebattleWeb.PublicApi.V1.SpecController do
  use CodebattleWeb, :controller

  alias CodebattleWeb.Frontend

  @spec_path Path.expand("../../../../../priv/openapi/public_api_v1.json", __DIR__)
  @external_resource @spec_path
  @spec_json File.read!(@spec_path)

  def show(conn, _params) do
    conn
    |> put_resp_content_type("application/json")
    |> send_resp(200, @spec_json)
  end

  def docs(conn, _params) do
    html = """
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Codebattle Public API</title>
        #{asset_tags()}
      </head>
      <body>
        <div id="swagger-ui"></div>
      </body>
    </html>
    """

    conn |> put_resp_content_type("text/html") |> send_resp(200, html)
  end

  # Swagger UI is bundled by Vite (frontend/src/apiDocs), never loaded from a CDN.
  defp asset_tags do
    entry = Frontend.api_docs_entry_path()

    if CodebattleWeb.Vite.dev?() do
      dev_server = Frontend.dev_server_url()

      """
      <script type="module" src="#{dev_server}/@vite/client"></script>
      <script type="module" src="#{dev_server}/#{entry}"></script>
      """
    else
      assets = Frontend.assets(entry)
      styles = Enum.map_join(assets.css, "\n", &~s(<link rel="stylesheet" href="#{&1}">))
      script = if assets.js, do: ~s(<script type="module" src="#{assets.js}"></script>), else: ""
      styles <> "\n" <> script
    end
  end
end
