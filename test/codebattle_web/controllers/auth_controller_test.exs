defmodule CodebattleWeb.AuthControllerTest do
  use CodebattleWeb.ConnCase, async: true

  alias Codebattle.User

  test "/auth/request", %{conn: conn} do
    # TODO test request
  end

  test "GET /auth/logout", %{conn: conn} do
    user = User.changeset(%User{}, %{name: "test_name", email: "test@test.test", github_id: 1})
    user = Repo.insert!(user)
    conn = assign(conn, :user, user)

    conn = get conn, "/auth/logout"

    # TODO check put_flash
    assert conn.status == 302
    # TODO check session
  end

  test "/auth/github/callback ueberauth failure", %{conn: conn} do
    # TODO callback ueberauth failure
  end

  test "/auth/github/callback ueberauth auth", %{conn: conn} do
    # TODO callback ueberauth auth
  end
end
