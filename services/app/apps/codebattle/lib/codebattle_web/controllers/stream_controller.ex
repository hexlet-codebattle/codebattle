defmodule CodebattleWeb.StreamController do
  use CodebattleWeb, :controller

  import PhoenixGon.Controller

  alias Codebattle.StreamConfig

  require Logger

  plug(CodebattleWeb.Plugs.RequireAuth when action in [:index])

  def index(conn, _params) do
    stream_configs = StreamConfig.get_all(conn.assigns.current_user.id)

    conn
    |> put_gon(stream_configs: stream_configs)
    |> render("index.html", layout: {CodebattleWeb.LayoutView, :external})
  end
end
