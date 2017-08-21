defmodule CodebattleWeb.GameControllerTest do
  use CodebattleWeb.ConnCase, async: true

  test "GET /games", %{conn: conn} do
    user = User.changeset(%User{}, %{name: "test_name", email: "test@test.test", github_id: 1})
    user = Repo.insert!(user)
    conn = assign(conn, :user, user)

    conn = get conn, "/games"
    assert html_response(conn, 200) =~ "Create game"
  end
end
