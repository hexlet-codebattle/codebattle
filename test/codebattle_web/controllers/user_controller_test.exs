defmodule CodebattleWeb.UserControllerTest do
  use CodebattleWeb.ConnCase, async: true

  test "index for signed_user", %{conn: conn} do
    user = insert(:user)
    conn = conn
           |> put_session(:user_id, user.id)
           |> get(user_path(conn, :index))
    assert conn.status == 200
  end

  test "index", %{conn: conn} do
    conn = conn
           |> get(user_path(conn, :index))
    assert redirected_to(conn, 302) =~ "/"
  end
end
