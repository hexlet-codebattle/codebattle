defmodule CodebattleWeb.AuthControllerTest do
  use CodebattleWeb.ConnCase, async: true

  @valid_data %{
    "login" => Faker.Internet.user_name(),
    "emails" => [%{"email" => Faker.Internet.email(), "primary" => true}]
  }

  test "GET /auth/:provider and ueberauth auth", %{conn: conn} do
    auth = build(:auth, extra: %{raw_info: %{user: @valid_data}})
    successful_conn = Map.put(conn, :assigns, %{ueberauth_auth: auth})

    conn = get(successful_conn, "/auth/github")
    assert conn.state == :sent
    assert conn.status == 302
    assert redirected_to(conn) !== "/"
  end

  test "/auth/github/callback ueberauth failure", %{conn: conn} do
    failure_conn = Map.put(conn, :assigns, %{ueberauth_failure: %{}})
    conn = get(failure_conn, "/auth/github/callback")

    assert conn.state == :sent
    assert redirected_to(conn) == "/"
  end
end
