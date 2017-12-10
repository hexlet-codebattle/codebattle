defmodule CodebattleWeb.UserControllerTest do
  use CodebattleWeb.ConnCase, async: true

  test "GET /users", %{conn: conn} do
    user1 = insert(:user, %{name: "test1", email: "test1@test.test", github_id: 1, raiting: 10})
    insert(:user, %{name: "test2", email: "test2@test.test", github_id: 2, raiting: 11})
    insert(:user, %{name: "test3", email: "test3@test.test", github_id: 3, raiting: 12})
    conn = assign(conn, :user, user1)

    conn = get conn, "/users"
    assert conn.status == 200
  end
end
