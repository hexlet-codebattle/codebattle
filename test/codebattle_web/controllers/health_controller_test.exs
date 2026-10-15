defmodule CodebattleWeb.HealthControllerTest do
  use CodebattleWeb.ConnCase, async: false

  setup do
    Codebattle.Deployment.set_draining(false)

    on_exit(fn ->
      Codebattle.Deployment.set_draining(false)
    end)

    :ok
  end

  describe ".index" do
    test "works", %{conn: conn} do
      conn
      |> get(Routes.health_path(conn, :index))
      |> json_response(200)
    end
  end

  describe ".drain" do
    test "rejects non-loopback request", %{conn: conn} do
      conn = %{conn | remote_ip: {10, 10, 10, 10}}

      conn
      |> post(Routes.health_path(conn, :drain))
      |> json_response(403)
    end

    test "allows loopback request", %{conn: conn} do
      response =
        conn
        |> post(Routes.health_path(conn, :drain))
        |> json_response(200)

      assert response["status"] == "draining"
    end
  end

  describe ".release_ready" do
    test "rejects non-loopback request", %{conn: conn} do
      conn = %{conn | remote_ip: {10, 10, 10, 10}}

      conn
      |> get(Routes.health_path(conn, :release_ready))
      |> json_response(403)
    end

    test "allows loopback request", %{conn: conn} do
      conn = get(conn, Routes.health_path(conn, :release_ready))

      assert conn.status in [200, 503]
    end
  end

  describe ".handoff" do
    test "rejects non-loopback request", %{conn: conn} do
      conn = %{conn | remote_ip: {10, 10, 10, 10}}

      conn
      |> post(Routes.health_path(conn, :handoff))
      |> json_response(403)
    end

    test "allows loopback request", %{conn: conn} do
      response =
        conn
        |> post(Routes.health_path(conn, :handoff))
        |> json_response(200)

      assert response["status"] in ["ok", "no_target_node", "handoff_in_progress", "error"]
    end
  end
end
