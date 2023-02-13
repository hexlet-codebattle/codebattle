defmodule CodebattleWeb.AuthControllerTest do
  use CodebattleWeb.ConnCase, async: true

  alias Codebattle.Repo
  alias Codebattle.User

  describe "request" do
    test "GET /auth/github", %{conn: conn} do
      conn = get(conn, "/auth/github")
      assert conn.state == :sent
      assert conn.status == 302
      assert redirected_to(conn) =~ "https://github.com/login/oauth/authorize?"
    end

    test "GET /auth/discord", %{conn: conn} do
      conn = get(conn, "/auth/discord")
      assert conn.state == :sent
      assert conn.status == 302
      assert redirected_to(conn) =~ "https://discord.com/oauth2/authorize?"
    end

    test "GET /auth/lol", %{conn: conn} do
      conn = get(conn, "/auth/lol")
      assert conn.state == :sent
      assert conn.status == 302
      assert redirected_to(conn) == "/"
    end
  end

  describe "callback" do
    # TODO: add failuer tests
    test "/auth/github/callback creates user", %{conn: conn} do
      conn = get(conn, "/auth/github/callback", %{"code" => "asfd", "next" => "/next_path"})
      user = Repo.get_by(User, name: "test_user")

      assert %User{
               achievements: [],
               avatar_url: "https://avatars3.githubusercontent.com/u/10835816",
               discord_avatar: nil,
               discord_id: nil,
               discord_name: nil,
               email: "test@gmail.com",
               github_id: 19,
               github_name: "test_user",
               is_bot: false,
               is_guest: false,
               name: "test_user",
               rank: 5432,
               rating: 1200
             } = user

      assert conn.state == :sent
      assert redirected_to(conn) == "/next_path"
    end

    test "/auth/github/callback creates uniq name for user", %{conn: conn} do
      insert(:user, name: "test_user", github_id: 1111)
      conn = get(conn, "/auth/github/callback", %{"code" => "asfd", "next" => "/next_path"})
      user = Repo.get_by(User, github_id: 19)

      assert %User{github_id: 19, github_name: "test_user"} = user
      "test_user_" <> code = user.name
      assert String.length(code) == 4

      assert conn.state == :sent
      assert redirected_to(conn) == "/next_path"
    end

    test "/auth/discord/callback creates user", %{conn: conn} do
      conn = get(conn, "/auth/discord/callback", %{"code" => "asfd", "next" => "/next_path"})
      user = Repo.get_by(User, name: "test_name")

      assert %User{
               achievements: [],
               avatar_url: "https://cdn.discordapp.com/avatars/1234567/12345.jpg",
               discord_avatar: "12345",
               discord_id: 1_234_567,
               discord_name: "test_name",
               editor_mode: nil,
               editor_theme: nil,
               email: "lol@kek.com",
               firebase_uid: nil,
               games_played: nil,
               github_id: nil,
               github_name: nil,
               is_bot: false,
               is_guest: false,
               lang: "js",
               name: "test_name",
               rank: 5432,
               rating: 1200
             } = user

      assert conn.state == :sent
      assert redirected_to(conn) == "/next_path"
    end

    test "/auth/discord/callback creates uniq name for user", %{conn: conn} do
      insert(:user, name: "test_name", discord_id: 123)
      conn = get(conn, "/auth/discord/callback", %{"code" => "asfd", "next" => "/next_path"})
      user = Repo.get_by(User, discord_id: 1_234_567)

      assert %User{discord_id: 1_234_567, discord_name: "test_name"} = user
      "test_name_" <> code = user.name
      assert String.length(code) == 4

      assert conn.state == :sent
      assert redirected_to(conn) == "/next_path"
    end

    test "/auth/github/lol", %{conn: conn} do
      conn = get(conn, "/auth/lol/callback")

      assert conn.state == :sent
      assert redirected_to(conn) == "/"
    end
  end
end
