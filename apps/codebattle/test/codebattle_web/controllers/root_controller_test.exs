defmodule Codebattle.RootControllerTest do
  use CodebattleWeb.ConnCase, async: true

  test "index", %{conn: conn} do
    conn = get(conn, "/")
    assert html_response(conn, 200)
  end

  test "index for signed_user", %{conn: conn} do
    user = insert(:user)

    conn =
      conn
      |> put_session(:user_id, user.id)
      |> get(Routes.user_path(conn, :index))

    assert conn.status == 200
  end

  test "authorized page", %{conn: conn} do
    conn = get(conn, "/authorized")

    assert html_response(conn, 200) =~
             "You successfully authorized to the platform. Open your tournament link to start."
  end
end
