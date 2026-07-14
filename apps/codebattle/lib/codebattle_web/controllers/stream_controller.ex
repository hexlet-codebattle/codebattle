defmodule CodebattleWeb.StreamController do
  use CodebattleWeb, :controller

  alias Codebattle.StreamConfig

  require Logger

  plug(CodebattleWeb.Plugs.RequireAuth when action in [:index, :stream_preset])

  plug(:put_view, CodebattleWeb.StreamView)
  plug(:put_layout, html: {CodebattleWeb.LayoutView, :app})

  def index(conn, %{"modern" => _}) do
    stream_configs =
      conn.assigns.current_user.id
      |> StreamConfig.get_all()
      |> Enum.map(& &1.config)

    render(conn, "index.html",
      layout: {CodebattleWeb.LayoutView, :external},
      stream_configs: stream_configs
    )
  end

  def index(conn, params) do
    conn
    |> put_layout(html: {CodebattleWeb.LayoutView, :empty})
    |> render_inertia("Stream", %{"tournament_id" => params["tournament_id"]})
  end

  def stream_preset(conn, _params) do
    user_id = conn.assigns.current_user.id

    case StreamConfig.get_all(user_id) do
      [%{config: config} | _] when is_map(config) ->
        json(conn, %{config: config})

      _ ->
        json(conn, %{config: %{}})
    end
  end
end
