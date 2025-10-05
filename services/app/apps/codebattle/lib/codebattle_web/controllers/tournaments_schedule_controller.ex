defmodule CodebattleWeb.TournamentsScheduleController do
  use CodebattleWeb, :controller

  import PhoenixGon.Controller

  alias Codebattle.StreamConfig

  require Logger

  plug(CodebattleWeb.Plugs.RequireAuth when action in [:index])

  def index(conn, _) do
    conn
    |> render("index.html")
  end
end
