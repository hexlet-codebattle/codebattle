defmodule CodebattleWeb.UserControllerTest do
  use CodebattleWeb.ConnCase, async: true

  alias Codebattle.User

  test "GET /users", %{conn: conn} do
    user1 = User.changeset(%User{}, %{name: "test1", email: "test1@test.test", github_id: 1, raiting: 10})
    user2 = User.changeset(%User{}, %{name: "test2", email: "test2@test.test", github_id: 2, raiting: 11})
    user3 = User.changeset(%User{}, %{name: "test3", email: "test3@test.test", github_id: 3, raiting: 12})
    user1 = Repo.insert!(user1)
    user2 = Repo.insert!(user2)
    user3 = Repo.insert!(user3)
    conn = assign(conn, :user, user1)

    conn = get conn, "/users"
    assert html_response(conn, 200) =~ "1) name: test3, raiting: 12"
    assert html_response(conn, 200) =~ "2) name: test2, raiting: 11"
    assert html_response(conn, 200) =~ "3) name: test1, raiting: 10"
  end
end
