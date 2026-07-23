defmodule CodebattleWeb.Plugs.AssignCurrentUserTest do
  use CodebattleWeb.ConnCase, async: true

  test "requires a new login for a legacy browser session", %{conn: conn} do
    user = insert(:user)

    conn =
      conn
      |> put_session(:user_id, user.id)
      |> get(Routes.root_path(conn, :index))

    assert conn.status == 302
    assert get_session(conn, :user_id) == nil
  end

  test "clears a legacy API session and assigns a guest", %{conn: conn} do
    user = insert(:user)

    conn =
      conn
      |> put_session(:user_id, user.id)
      |> get(Routes.api_v1_user_path(conn, :current))

    assert json_response(conn, 200) == %{"id" => 0}
    assert get_session(conn, :user_id) == nil
    assert conn.assigns.current_user.is_guest
  end

  test "clears a revoked browser session", %{conn: conn} do
    user = insert(:user)
    conn = log_in_user(conn, user)
    token = get_session(conn, :user_session_token)
    :ok = Codebattle.UserSession.revoke_by_token(token)

    conn = get(conn, Routes.root_path(conn, :index))

    assert conn.status == 302
    assert get_session(conn, :user_session_token) == nil
  end

  test "treats a revoked API session as a guest", %{conn: conn} do
    user = insert(:user)
    conn = log_in_user(conn, user)
    token = get_session(conn, :user_session_token)
    :ok = Codebattle.UserSession.revoke_by_token(token)

    conn = get(conn, Routes.api_v1_user_path(conn, :current))

    assert json_response(conn, 200) == %{"id" => 0}
    assert get_session(conn, :user_session_token) == nil
  end
end
