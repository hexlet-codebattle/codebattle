defmodule CodebattleWeb.SessionControllerTest do
  use CodebattleWeb.ConnCase, async: true

  test "new", %{conn: conn} do
    conn =
      get(
        conn,
        Routes.session_path(conn, :new)
      )

    assert conn.status == 200
  end

  test "remind_password", %{conn: conn} do
    conn =
      get(
        conn,
        Routes.session_path(conn, :remind_password)
      )

    assert conn.status == 200
  end
end
