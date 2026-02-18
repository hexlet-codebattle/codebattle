defmodule CodebattleWeb.Plugs.AssignCurrentUserTest do
  use CodebattleWeb.ConnCase, async: true

  test "clear session if user have id in session, but doesn't have db record", %{conn: conn} do
    conn =
      conn
      |> put_session(:user_id, 1_000_000)
      |> get(Routes.root_path(conn, :index))

    assert conn.status == 302
    assert get_session(conn, :user_id) == nil
  end
end
