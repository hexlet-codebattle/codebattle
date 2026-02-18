defmodule RunnerWeb.HealthController do
  use RunnerWeb, :controller

  def index(conn, _params) do
    conn
    |> put_status(200)
    |> json(%{status: "ok"})
  end
end
