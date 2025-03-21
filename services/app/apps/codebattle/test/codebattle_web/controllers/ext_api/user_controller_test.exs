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
      |> post(Routes.ext_api_user_path(conn, :create, %{name: "lol", clan: "S2xhbg==", UID: "asdf", category: "cat"}))
      |> json_response(200)

      user = Repo.get_by(User, name: "lol")
      clan = Repo.get_by(Clan, name: "Klan")
      assert "cat" == user.category
      assert "asdf" == user.external_oauth_id
      assert 1 == clan.creator_id
      assert user.clan_id == clan.id
      assert user.sound_settings == %User.SoundSettings{level: 0, type: "silent"}
      assert user.subscription_type == :premium
    end

    test "creates user with empty params", %{conn: conn} do
      conn
      |> put_req_header("x-auth-key", "x-key")
      |> post(Routes.ext_api_user_path(conn, :create, %{UID: "asdf"}))
      |> json_response(200)

      user = User |> Repo.all() |> Enum.find(&(&1.id > 0))

      assert user.name
      assert user.external_oauth_id
      assert user.clan
    end

    test "creates user with existing name", %{conn: conn} do
      conn
      |> put_req_header("x-auth-key", "x-key")
      |> post(Routes.ext_api_user_path(conn, :create, %{name: "lol", clan: "kek", UID: "uid1"}))
      |> json_response(200)

      conn
      |> put_req_header("x-auth-key", "x-key")
      |> post(Routes.ext_api_user_path(conn, :create, %{name: "lol", clan: "kek", UID: "uid2"}))
      |> json_response(200)

      %{id: clan_id} = Repo.get_by(Clan, name: "kek")
      users = User |> Repo.all() |> Enum.filter(&(&1.id > 0))

      assert [
               %{name: "lol", clan: "kek", external_oauth_id: "uid1", clan_id: ^clan_id},
               %{name: name, clan: "kek", external_oauth_id: "uid2", clan_id: ^clan_id}
             ] = Enum.sort_by(users, & &1.external_oauth_id)

      assert String.starts_with?(name, "lol")
    end

    test "creates user with existing clan by name", %{conn: conn} do
      clan = insert(:clan, name: "Kek", long_name: "lOl_kEk")

      conn
      |> put_req_header("x-auth-key", "x-key")
      |> post(Routes.ext_api_user_path(conn, :create, %{name: "oiblz", clan: "Kek ", UID: "asdf"}))
      |> json_response(200)

      users = User |> Repo.all() |> Enum.filter(&(&1.id > 0))
      assert [clan.id] == Enum.map(users, & &1.clan_id)
      assert ["Kek"] == Enum.map(users, & &1.clan)
    end

    test "creates user with existing clan by long_name", %{conn: conn} do
      clan = insert(:clan, name: "kEk", long_name: "LoL_KeK")

      conn
      |> put_req_header("x-auth-key", "x-key")
      |> post(
        Routes.ext_api_user_path(conn, :create, %{
          name: "oiblz",
          clan: "LoL_KeK",
          UID: "asdf"
        })
      )
      |> json_response(200)

      users = User |> Repo.all() |> Enum.filter(&(&1.id > 0))
      assert [clan.id] == Enum.map(users, & &1.clan_id)
      assert ["kEk"] == Enum.map(users, & &1.clan)
    end

    test "updates user by UID", %{conn: conn} do
      clan = insert(:clan, name: "Kek", long_name: "lOl_kEk")
      user = insert(:user, name: "whatever", clan_id: nil, subscription_type: :free, external_oauth_id: "asdf")

      conn
      |> put_req_header("x-auth-key", "x-key")
      |> post(Routes.ext_api_user_path(conn, :create, %{category: "lol", name: "oiblz", clan: "Kek ", UID: "asdf"}))
      |> json_response(200)

      user = Repo.get(User, user.id)

      assert %{
               id: user.id,
               name: "oiblz",
               clan_id: clan.id,
               category: "lol",
               external_oauth_id: "asdf",
               subscription_type: :premium
             } == Map.take(user, [:id, :name, :clan_id, :external_oauth_id, :subscription_type, :category])
    end

    test "updates user with duplicated name by UID", %{conn: conn} do
      clan = insert(:clan, name: "Kek", long_name: "lOl_kEk")
      insert(:user, name: "oiblz")
      user = insert(:user, name: "whatever", clan_id: nil, subscription_type: :free, external_oauth_id: "asdf")

      conn
      |> put_req_header("x-auth-key", "x-key")
      |> post(Routes.ext_api_user_path(conn, :create, %{category: "lol", name: "oiblz", clan: "Kek ", UID: "asdf"}))
      |> json_response(200)

      user = Repo.get(User, user.id)
      assert String.starts_with?(user.name, "oiblz")

      assert %{
               id: user.id,
               clan_id: clan.id,
               external_oauth_id: "asdf",
               category: "lol",
               subscription_type: :premium
             } == Map.take(user, [:id, :clan_id, :external_oauth_id, :subscription_type, :category])
    end
  end
end
