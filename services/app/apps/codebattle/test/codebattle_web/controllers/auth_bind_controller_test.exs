defmodule CodebattleWeb.AuthBindControllerTest do
  use CodebattleWeb.ConnCase, async: true

  alias Codebattle.Repo

  @valid_data %{
    "username" => Faker.Internet.user_name(),
    "email" => Faker.Internet.email()
  }

  test "GET /auth/:provider and ueberauth auth", %{conn: conn} do
    auth = build(:auth, provider: :discord)
    successful_conn = Map.put(conn, :assigns, %{ueberauth_auth: auth})

    conn = get(successful_conn, "/auth/discord/bind/")
    assert conn.state == :sent
    assert conn.status == 302
    assert redirected_to(conn) !== "/"
  end

  test "GET /auth/:provide/callback successfully updated user", %{conn: conn} do
    user = insert(:user)
    auth = build(:auth, extra: %{raw_info: %{user: @valid_data}}, provider: :discord)

    conn = conn |> put_session(:user_id, user.id)
    successful_conn = Map.put(conn, :assigns, %{ueberauth_auth: auth})
    conn = get(successful_conn, "/auth/discord/callback/bind")

    user = Repo.reload!(user)

    assert redirected_to(conn) == "/"
    assert user.discord_id == auth.uid
  end

  describe "DELETE /auth/:provider/" do
    test "unbinds discord", %{conn: conn} do
      user = insert(:user)
      conn = conn |> put_session(:user_id, user.id)
      delete(conn, "/auth/discord")

      user = Repo.reload!(user)

      assert user.discord_id == nil
      assert user.discord_name == nil
      assert user.discord_avatar == nil
    end

    test "unbinds github", %{conn: conn} do
      user = insert(:user)
      conn = conn |> put_session(:user_id, user.id)
      delete(conn, "/auth/github")

      user = Repo.reload!(user)

      assert user.github_id == nil
      assert user.github_name == nil
    end
  end
end
