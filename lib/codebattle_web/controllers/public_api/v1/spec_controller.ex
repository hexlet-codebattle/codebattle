defmodule CodebattleWeb.PublicApi.V1.SpecController do
  use CodebattleWeb, :controller

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
        <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
      </head>
      <body>
        <div id="swagger-ui"></div>
        <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
        <script>SwaggerUIBundle({ url: "/public_api/v1/openapi.json", dom_id: "#swagger-ui" });</script>
      </body>
    </html>
    """

    conn |> put_resp_content_type("text/html") |> send_resp(200, html)
  end
end
