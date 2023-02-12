defmodule CodebattleWeb.HealthController do
  use CodebattleWeb, :controller

  def index(conn, _params) do
    conn
    |> put_status(200)
    |> json(%{status: "ok"})
  end
end
