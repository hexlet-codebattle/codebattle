defmodule CodebattleWeb.AuthControllerTest do
  use CodebattleWeb.ConnCase, async: true
  alias CodebattleWeb.AuthController

  @valid_data %{
    "login" => Faker.Internet.user_name,
    "emails" => [%{"email" => Faker.Internet.email, "primary" => true}],
    }

  test "/auth/:provider", %{conn: conn} do
    conn = get conn, "/auth/github"
    assert conn.state == :sent
    assert conn.status == 302
  end

  test "GET /auth/logout", %{conn: conn} do
    user = insert(:user)
    conn = assign(conn, :user, user)

    conn = get conn, "/auth/logout"

    assert get_flash(conn, :info) == "You have been logged out!"
    assert conn.state == :sent
    assert redirected_to(conn) == "/"
  end

  # test "/auth/github/callback ueberauth failure", %{conn: conn} do
  #   failure_conn = Map.put(conn, :assigns, %{ueberauth_failure: %{}})
  #   conn = AuthController.callback(failure_conn, %{})

  #   assert get_flash(conn, :danger) == "Failed to authenticate."
  #   assert conn.state == :sent
  #   assert redirected_to(conn) == "/"
  # end

  # test "/auth/github/callback ueberauth auth", %{conn: conn} do
  #   auth = build(:auth, extra: %{ raw_info: %{ user: @valid_data } })
  #   successful_conn = Map.put(conn, :assigns, %{ueberauth_auth: auth})

  #   conn = AuthController.callback(successful_conn, %{})

  #   assert get_flash(conn, :info) == "Successfully authenticated."
  #   assert conn.state == :sent
  #   assert redirected_to(conn) == "/"
  # end
end
