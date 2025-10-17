defmodule CodebattleWeb.Api.V1.SettingsControllerTest do
  use CodebattleWeb.ConnCase, async: false

  alias Codebattle.Repo

  describe "#show" do
    test "shows current user settings", %{conn: conn} do
      user =
        insert(:user, %{
          name: "first",
          email: "test1@test.test",
          github_id: 1,
          github_name: "g_name",
          clan: "abc",
          rating: 2400,
          lang: "dart"
        })

      conn =
        conn
        |> put_session(:user_id, user.id)
        |> get(Routes.api_v1_settings_path(conn, :show))

      assert json_response(conn, 200) == %{
               "name" => "first",
               "lang" => "dart",
               "locale" => "en",
               "clan" => "abc",
               "sound_settings" => %{"level" => 7, "type" => "dendy"},
               "github_id" => 1,
               "github_name" => "g_name"
             }
    end
  end

  describe "#update" do
    test "updates current user settings", %{conn: conn} do
      clan = insert(:clan, name: "Bca")

      new_settings = %{
        "name" => "evgen",
        "clan" => "  Bca  ",
        "locale" => "ru",
        "sound_settings" => %{"level" => 3, "type" => "cs"},
        "lang" => "ruby"
      }

      user = insert(:user)

      conn =
        conn
        |> put_session(:user_id, user.id)
        |> patch(Routes.api_v1_settings_path(conn, :update, new_settings))

      assert json_response(conn, 200) == Map.put(new_settings, "clan", "Bca")

      updated = Repo.get!(Codebattle.User, user.id)

      assert updated.sound_settings.level == 3
      assert updated.sound_settings.type == "cs"
      assert updated.clan == "Bca"
      assert updated.clan_id == clan.id
      assert updated.name == "evgen"
      assert updated.lang == "ruby"
      assert updated.locale == "ru"
    end

    test "update with empty name doesn't work", %{conn: conn} do
      new_settings = %{"name" => ""}

      user = insert(:user)

      conn =
        conn
        |> put_session(:user_id, user.id)
        |> patch(Routes.api_v1_settings_path(conn, :update, new_settings))

      assert json_response(conn, 422) == %{"errors" => %{"name" => ["can't be blank"]}}

      updated = Repo.get!(Codebattle.User, user.id)

      assert updated.name == user.name
    end

    test "returns validation errors", %{conn: conn} do
      new_settings = %{"name" => "evgen"}
      user = insert(:user)
      insert(:user, %{name: "evgen"})

      conn =
        conn
        |> put_session(:user_id, user.id)
        |> patch(Routes.api_v1_settings_path(conn, :show, new_settings))

      assert json_response(conn, 422) == %{"errors" => %{"name" => ["has already been taken"]}}
    end
  end
end
