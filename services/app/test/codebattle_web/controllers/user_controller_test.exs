defmodule CodebattleWeb.UserControllerTest do
  use CodebattleWeb.ConnCase, async: true

  test "index for signed_user", %{conn: conn} do
    user = insert(:user)

    conn =
      conn
      |> put_session(:user_id, user.id)
      |> get(user_path(conn, :index))

    assert conn.status == 200
  end

  test "index", %{conn: conn} do
    conn =
      conn
      |> get(user_path(conn, :index))

    assert redirected_to(conn, 302) == "/"
  end

  test "show user: signed in", %{conn: conn} do
    user = insert(:user)

    conn =
      conn
      |> put_session(:user_id, user.id)
      |> get(user_path(conn, :show, user.id))

    assert conn.status == 200
  end

  test "show user: not signed in", %{conn: conn} do
    user = insert(:user)

    conn =
      conn
      |> get(user_path(conn, :show, user.id))

    assert redirected_to(conn, 302) == "/"
  end

  test "edit user", %{conn: conn} do
    user = insert(:user)

    conn = get(conn, user_path(conn, :edit, user))
    assert html_response(conn, 200) =~ user.name
  end
end
