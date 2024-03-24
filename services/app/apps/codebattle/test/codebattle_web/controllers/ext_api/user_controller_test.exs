defmodule CodebattleWeb.ExtApi.UserControllerTest do
  use CodebattleWeb.ConnCase, async: true

  alias Codebattle.Clan
  alias Codebattle.Repo
  alias Codebattle.User

  describe "create/2" do
    test "checks auth", %{conn: conn} do
      assert conn
             |> post(Routes.ext_api_user_path(conn, :create, %{name: "hacker"}))
             |> json_response(401)
    end

    test "creates user with clan and auth token", %{conn: conn} do
      conn
      |> put_req_header("x-auth-key", "x-key")
      |> post(
        Routes.ext_api_user_path(conn, :create, %{name: "lol", clan: "kek", auth_token: "asdf"})
      )
      |> json_response(200)

      user = Repo.get_by(User, name: "lol")
      clan = Repo.get_by(Clan, name: "kek")
      assert "asdf" == user.auth_token
      assert 1 == clan.creator_id
      assert user.clan_id == clan.id
    end

    test "creates user with empty params", %{conn: conn} do
      conn
      |> put_req_header("x-auth-key", "x-key")
      |> post(Routes.ext_api_user_path(conn, :create, %{}))
      |> json_response(200)

      user = User |> Repo.all() |> Enum.find(&(&1.id > 0))

      assert user.name
      assert user.auth_token
      assert user.clan
    end

    test "creates user with existing name", %{conn: conn} do
      conn
      |> put_req_header("x-auth-key", "x-key")
      |> post(
        Routes.ext_api_user_path(conn, :create, %{name: "lol", clan: "kek", auth_token: "asdf"})
      )
      |> json_response(200)

      conn
      |> put_req_header("x-auth-key", "x-key")
      |> post(
        Routes.ext_api_user_path(conn, :create, %{name: "lol", clan: "kek", auth_token: "asdf"})
      )
      |> json_response(200)

      clan = Repo.get_by(Clan, name: "kek")
      users = User |> Repo.all() |> Enum.filter(&(&1.id > 0))
      assert [clan.id, clan.id] == Enum.map(users, & &1.clan_id)
      assert ["kek", "kek"] == Enum.map(users, & &1.clan)
    end
  end
end
