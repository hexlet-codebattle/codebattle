defmodule CodebattleWeb.Api.V1.SettingsControllerTest do
  use CodebattleWeb.ConnCase, async: true

  alias Codebattle.Repo

  describe "#show" do
    test "shows current user settings", %{conn: conn} do
      user =
        insert(:user, %{
          name: "first",
          email: "test1@test.test",
          github_id: 1,
          github_name: "g_name",
          discord_id: 2,
          discord_name: "d_name",
          discord_avatar: "d_avatar",
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
               "sound_settings" => %{"level" => 7, "type" => "dendy"},
               "discord_avatar" => "d_avatar",
               "discord_id" => 2,
               "discord_name" => "d_name",
               "github_id" => 1,
               "github_name" => "g_name"
             }
    end
  end

  describe "#update" do
    test "updates current user settings", %{conn: conn} do
      new_settings = %{
        "name" => "evgen",
        "sound_settings" => %{"level" => 3, "type" => "cs"},
        "lang" => "ruby"
      }

      user = insert(:user)

      conn =
        conn
        |> put_session(:user_id, user.id)
        |> patch(Routes.api_v1_settings_path(conn, :show, new_settings))

      assert json_response(conn, 200) == new_settings

      updated = Repo.get!(Codebattle.User, user.id)

      assert updated.sound_settings.level == 3
      assert updated.sound_settings.type == "cs"
      assert updated.name == "evgen"
      assert updated.lang == "ruby"
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
