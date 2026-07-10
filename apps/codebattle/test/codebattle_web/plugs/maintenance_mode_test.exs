defmodule CodebattleWeb.Plugs.MaintenanceModeTest do
  use CodebattleWeb.ConnCase, async: false

  setup do
    FunWithFlags.enable(:maintenance_mode)

    :ok
  end

  test "allows /auth/token during maintenance mode", %{conn: conn} do
    conn = get(conn, "/auth/token")

    assert conn.status == 302
    assert redirected_to(conn) == "/"
  end

  test "blocks oauth entrypoints during maintenance mode", %{conn: conn} do
    conn = get(conn, "/auth/github")

    assert conn.status == 503
    assert conn.state == :sent
  end
end
