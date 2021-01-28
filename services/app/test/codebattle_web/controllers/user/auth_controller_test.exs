defmodule CodebattleWeb.User.AuthControllerTest do
  use CodebattleWeb.ConnCase, async: true

  alias Codebattle.Repo

  @valid_data %{
    "username" => Faker.Internet.user_name(),
    "email" => Faker.Internet.email()
  }

  test "GET /auth/:provider and ueberauth auth", %{conn: conn} do
    auth = build(:auth, provider: :discord)
    successful_conn = Map.put(conn, :assigns, %{ueberauth_auth: auth})

    conn = get(successful_conn, "/user/auth/discord")
    assert conn.state == :sent
    assert conn.status == 302
    assert redirected_to(conn) !== "/"
  end

  test "GET /auth/:provide/callback successfully updated user", %{conn: conn} do
    user = insert(:user)
    auth = build(:auth, extra: %{raw_info: %{user: @valid_data}}, provider: :discord)

    conn = conn |> put_session(:user_id, user.id)
    successful_conn = Map.put(conn, :assigns, %{ueberauth_auth: auth})
    conn = get(successful_conn, "/user/auth/discord/callback")

    user = Repo.reload!(user)

    assert redirected_to(conn) == "/"
    assert user.discord_id == auth.uid
  end
end
