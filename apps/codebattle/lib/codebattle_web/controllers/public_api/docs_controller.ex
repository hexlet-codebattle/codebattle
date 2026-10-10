defmodule CodebattleWeb.PublicApi.DocsController do
  use CodebattleWeb, :controller

  alias CodebattleWeb.PublicApi.Docs

  def show(conn, _params), do: send_doc(conn, "text/html", Docs.html())

  def markdown(conn, _params), do: send_doc(conn, "text/markdown", Docs.markdown())

  def llms_txt(conn, _params), do: send_doc(conn, "text/plain", Docs.llms_txt())

  defp send_doc(conn, content_type, body) do
    conn
    |> put_resp_content_type(content_type)
    |> put_resp_header("cache-control", "public, max-age=300")
    |> send_resp(200, body)
  end
end
