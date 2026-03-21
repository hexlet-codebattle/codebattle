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

  test "new redirects authenticated user to root", %{conn: conn} do
    user = insert(:user)

    conn =
      conn
      |> put_session(:user_id, user.id)
      |> get(Routes.session_path(conn, :new))

    assert redirected_to(conn) == "/"
  end

  test "new redirects authenticated user to next path", %{conn: conn} do
    user = insert(:user)

    conn =
      conn
      |> put_session(:user_id, user.id)
      |> get(Routes.session_path(conn, :new, next: "/settings"))

    assert redirected_to(conn) == "/settings"
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
