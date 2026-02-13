defmodule CodebattleWeb.HealthController do
  use CodebattleWeb, :controller

  require Logger

  def index(conn, _params) do
    if Codebattle.Deployment.draining?() do
      conn
      |> put_status(503)
      |> json(%{status: "draining"})
    else
      conn
      |> put_status(200)
      |> json(%{status: "ok"})
    end
  end

  def drain(conn, _params) do
    case authorize_control(conn) do
      :ok ->
        :ok = Codebattle.Deployment.set_draining(true)
        json(conn, %{status: "draining", counts: Codebattle.Deployment.runtime_counts()})

      :error ->
        conn
        |> put_status(:forbidden)
        |> json(%{status: "forbidden"})
    end
  end

  def release_ready(conn, _params) do
    case authorize_control(conn) do
      :ok ->
        counts = Codebattle.Deployment.runtime_counts()

        if Codebattle.Deployment.safe_to_stop?() do
          conn
          |> put_status(200)
          |> json(%{status: "ready_to_stop", counts: counts})
        else
          conn
          |> put_status(503)
          |> json(%{status: "waiting_active_runtime", counts: counts})
        end

      :error ->
        conn
        |> put_status(:forbidden)
        |> json(%{status: "forbidden"})
    end
  end

  def handoff(conn, _params) do
    case authorize_control(conn) do
      :ok ->
        Logger.info("Health handoff endpoint called from loopback, starting runtime handoff")
        report = Codebattle.Deployment.handoff_active_runtime()
        Logger.info("Health handoff endpoint finished with status=#{report["status"] || report[:status]}")
        json(conn, report)

      :error ->
        Logger.warning("Forbidden handoff endpoint call from remote_ip=#{inspect(conn.remote_ip)}")

        conn
        |> put_status(:forbidden)
        |> json(%{status: "forbidden"})
    end
  end

  defp authorize_control(conn) do
    if loopback_request?(conn) do
      :ok
    else
      :error
    end
  end

  defp loopback_request?(%Plug.Conn{remote_ip: {127, 0, 0, 1}}), do: true
  defp loopback_request?(%Plug.Conn{remote_ip: {0, 0, 0, 0, 0, 0, 0, 1}}), do: true
  defp loopback_request?(_conn), do: false
end
