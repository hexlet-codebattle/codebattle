defmodule CodebattleWeb.StreamController do
  use CodebattleWeb, :controller

  import PhoenixGon.Controller

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

    conn
    |> put_gon(stream_configs: stream_configs)
    |> render("index.html",
      layout: {CodebattleWeb.LayoutView, :external},
      stream_configs: stream_configs
    )
  end

  def index(conn, params) do
    conn
    |> put_gon(tournament_id: params["tournament_id"])
    |> render("index_classic.html",
      layout: {CodebattleWeb.LayoutView, :empty}
    )
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
