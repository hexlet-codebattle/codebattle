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

  test "show user profile: signed in", %{conn: conn} do
    user = insert(:user)

    conn =
      conn
      |> put_session(:user_id, user.id)
      |> get(user_path(conn, :show, user.id))

    assert conn.status == 200
  end

  test "show user profile: not signed in", %{conn: conn} do
    user = insert(:user)

    conn =
      conn
      |> get(user_path(conn, :show, user.id))

    assert redirected_to(conn, 302) == "/"
  end

  test "edit user profile: signed in", %{conn: conn} do
    user = insert(:user)

    conn =
      conn
      |> put_session(:user_id, user.id)
      |> get(user_path(conn, :edit, user.id))

    assert conn.status == 200
  end

  test "edit user profile: not signed in", %{conn: conn} do
    user = insert(:user)

    conn =
      conn
      |> get(user_path(conn, :edit, user.id))

    assert redirected_to(conn, 302) == "/"
  end

  test "edit user profile: different user", %{conn: conn} do
    user_owner = insert(:user)
    user_visitor = insert(:user)

    conn =
      conn
      |> put_session(:user_id, user_visitor.id)
      |> get(user_path(conn, :edit, user_owner.id))

    assert redirected_to(conn, 302) == "/users/#{user_owner.id}"
  end
end
