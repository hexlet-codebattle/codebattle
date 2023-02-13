defmodule CodebattleWeb.AuthBindControllerTest do
  use CodebattleWeb.ConnCase, async: true

  alias Codebattle.Repo
  alias Codebattle.User

  describe "request" do
    test "GET /auth/github/bind", %{conn: conn} do
      conn = get(conn, "/auth/github/bind")
      assert conn.state == :sent
      assert conn.status == 302
      assert redirected_to(conn) =~ "https://github.com/login/oauth/authorize?"
    end

    test "GET /auth/discord/bind", %{conn: conn} do
      conn = get(conn, "/auth/discord/bind")
      assert conn.state == :sent
      assert conn.status == 302
      assert redirected_to(conn) =~ "https://discord.com/oauth2/authorize?"
    end

    test "GET /auth/lol/bind", %{conn: conn} do
      conn = get(conn, "/auth/lol/bind")
      assert conn.state == :sent
      assert conn.status == 302
      assert redirected_to(conn) == "/"
    end
  end

  describe "callback" do
    test "GET /auth/github/callback/bind", %{conn: conn} do
      user = insert(:user, github_id: 1, discord_id: 1, name: "lol-kek")

      conn =
        conn
        |> put_session(:user_id, user.id)
        |> get("/auth/github/callback/bind", %{"code" => "asfd"})

      user = Repo.reload(user)

      assert %User{
               discord_id: 1,
               name: "lol-kek",
               email: "test@gmail.com",
               github_name: "test_user",
               github_id: 19,
               avatar_url: "https://avatars3.githubusercontent.com/u/10835816"
             } = user

      assert conn.state == :sent
      assert redirected_to(conn) == "/settings"
    end

    test "GET /auth/discord/callback/bind", %{conn: conn} do
      user = insert(:user, github_id: 1, discord_id: 1, name: "lol-kek")

      conn =
        conn
        |> put_session(:user_id, user.id)
        |> get("/auth/discord/callback/bind", %{"code" => "asfd"})

      user = Repo.reload(user)

      assert %User{
               avatar_url: "https://cdn.discordapp.com/avatars/1234567/12345.jpg",
               discord_avatar: "12345",
               discord_id: 1_234_567,
               discord_name: "test_name",
               email: "lol@kek.com",
               github_id: 1,
               name: "lol-kek"
             } = user

      assert conn.state == :sent
      assert redirected_to(conn) == "/settings"
    end
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
