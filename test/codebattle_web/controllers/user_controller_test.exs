defmodule CodebattleWeb.UserControllerTest do
  use CodebattleWeb.ConnCase, async: true

  test "GET /users", %{conn: conn} do
    user1 = insert(:user, %{name: "test1", email: "test1@test.test", github_id: 1, raiting: 10})
    insert(:user, %{name: "test2", email: "test2@test.test", github_id: 2, raiting: 11})
    insert(:user, %{name: "test3", email: "test3@test.test", github_id: 3, raiting: 12})
    conn = assign(conn, :user, user1)

    conn = get conn, "/users"
    assert html_response(conn, 200) =~ "1) name: test3, rating: 12"
    assert html_response(conn, 200) =~ "2) name: test2, rating: 11"
    assert html_response(conn, 200) =~ "3) name: test1, rating: 10"
  end
end
