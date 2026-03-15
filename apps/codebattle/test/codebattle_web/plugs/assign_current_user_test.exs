defmodule CodebattleWeb.Plugs.AssignCurrentUserTest do
  use CodebattleWeb.ConnCase, async: true

  test "clears session and redirects for html when session user does not exist", %{conn: conn} do
    conn =
      conn
      |> put_session(:user_id, 1_000_000)
      |> get(Routes.root_path(conn, :index))

    assert conn.status == 302
    assert get_session(conn, :user_id) == nil
  end

  test "clears session and assigns guest for api when session user does not exist", %{conn: conn} do
    conn =
      conn
      |> put_session(:user_id, 1_000_000)
      |> get(Routes.api_v1_user_path(conn, :current))

    assert json_response(conn, 200) == %{"id" => 0}
    assert get_session(conn, :user_id) == nil
    assert conn.assigns.current_user.is_guest
  end
end
