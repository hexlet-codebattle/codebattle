defmodule CodebattleWeb.StreamController do
  use CodebattleWeb, :controller

  import PhoenixGon.Controller
  alias Codebattle.StreamConfig

  require Logger

  plug(CodebattleWeb.Plugs.RequireAuth when action in [:index, :stream_preset])

  def index(conn, _params) do
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

  def stream_preset(conn, _params) do
    user_id = conn.assigns.current_user.id

    case StreamConfig.get_current(user_id) do
      %{"data" => data} when is_list(data) ->
        json(conn, %{blocks: data})

      %{} = preset when is_map(preset) ->
        json(conn, %{blocks: Map.get(preset, "data", [])})

      _ ->
        json(conn, %{blocks: []})
    end
  end
end
