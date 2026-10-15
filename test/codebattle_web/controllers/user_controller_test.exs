defmodule CodebattleWeb.UserControllerTest do
  use CodebattleWeb.ConnCase, async: true

  test "index is not available" do
    assert Phoenix.Router.route_info(CodebattleWeb.Router, "GET", "/users", "localhost") == :error
  end

  test "new", %{conn: conn} do
    conn =
      get(
        conn,
        Routes.user_path(conn, :new)
      )

    assert conn.status == 200
  end

  test "show user: signed in", %{conn: conn} do
    user = insert(:user)

    conn =
      conn
      |> log_in_user(user.id)
      |> get(Routes.user_path(conn, :show, user.id))

    assert conn.status == 200
  end

  test "show user: not signed in", %{conn: conn} do
    user = insert(:user)

    conn = get(conn, Routes.user_path(conn, :show, user.id))

    assert redirected_to(conn, 302) ==
             Routes.session_path(CodebattleWeb.Endpoint, :new, next: Routes.user_path(conn, :show, user.id))
  end

  test "edit user", %{conn: conn} do
    user = insert(:user)

    conn =
      conn
      |> log_in_user(user.id)
      |> get(Routes.user_setting_path(conn, :edit))

    assert conn.status == 200
  end
end
