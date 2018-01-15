defmodule Codebattle.PageControllerTest do
  use CodebattleWeb.ConnCase, async: true

  test "index", %{conn: conn} do
    conn = get conn, "/"
    assert html_response(conn, 200) =~ "Welcome to Codebattle!"
  end

  test "index for signed_user", %{conn: conn} do
    user = insert(:user)
    conn = conn
           |> put_session(:user_id, user.id)
           |> get(user_path(conn, :index))
    assert conn.status == 200
  end
end
