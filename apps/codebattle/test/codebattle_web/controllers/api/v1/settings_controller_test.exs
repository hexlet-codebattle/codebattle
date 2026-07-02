defmodule CodebattleWeb.Api.V1.SettingsControllerTest do
  use CodebattleWeb.ConnCase, async: false

  alias Codebattle.Repo
  alias Codebattle.User

  @old_password "old-password!"
  @new_password "new-password!"

  describe "#show" do
    test "shows current user settings", %{conn: conn} do
      user =
        insert(:user, %{
          name: "first",
          email: "test1@test.test",
          discord_id: 5_246_840,
          discord_name: "discord_name782",
          github_id: 1,
          github_name: "g_name",
          clan: "abc",
          rating: 2400,
          lang: "dart",
          db_type: "mongodb",
          style_lang: "less"
        })

      conn =
        conn
        |> put_session(:user_id, user.id)
        |> get(Routes.api_v1_settings_path(conn, :show))

      assert json_response(conn, 200) == %{
               "can_unlink_social" => true,
               "name" => "first",
               "lang" => "dart",
               "locale" => "en",
               "clan" => "abc",
               "discord_id" => 5_246_840,
               "discord_name" => "discord_name782",
               "sound_settings" => %{"level" => 7, "tournament_level" => 7, "type" => "dendy"},
               "db_type" => "mongodb",
               "style_lang" => "less",
               "github_id" => 1,
               "github_name" => "g_name",
               "has_password" => false
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
        "sound_settings" => %{"level" => 3, "tournament_level" => 8, "type" => "cs"},
        "db_type" => "postgresql",
        "style_lang" => "css",
        "lang" => "ruby"
      }

      user = insert(:user)

      conn =
        conn
        |> put_session(:user_id, user.id)
        |> patch(Routes.api_v1_settings_path(conn, :update, new_settings))

      assert json_response(conn, 200) ==
               new_settings
               |> Map.put("clan", "Bca")
               |> Map.put("can_unlink_social", true)
               |> Map.put("has_password", false)

      updated = Repo.get!(User, user.id)

      assert updated.sound_settings.level == 3
      assert updated.sound_settings.tournament_level == 8
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

      updated = Repo.get!(User, user.id)

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

  describe "#update_password" do
    test "updates password for current user", %{conn: conn} do
      user = insert_user_with_password()
      old_password_hash = user.password_hash

      conn =
        conn
        |> put_session(:user_id, user.id)
        |> patch("/api/v1/settings/password", %{
          "current_password" => @old_password,
          "password" => @new_password,
          "password_confirmation" => @new_password
        })

      assert json_response(conn, 200) == %{"status" => "ok", "has_password" => true}

      updated = Repo.get!(User, user.id)

      refute updated.password_hash == old_password_hash
      assert %User{id: user_id} = User.authenticate(user.name, @new_password)
      assert user_id == user.id
      refute User.authenticate(user.name, @old_password)
    end

    test "does not update password when new password is too short", %{conn: conn} do
      user = insert_user_with_password()

      conn =
        conn
        |> put_session(:user_id, user.id)
        |> patch("/api/v1/settings/password", %{
          "current_password" => @old_password,
          "password" => "short",
          "password_confirmation" => "short"
        })

      assert json_response(conn, 422) == %{
               "errors" => %{"password" => ["should be at least 6 character(s)"]}
             }

      updated = Repo.get!(User, user.id)

      assert updated.password_hash == user.password_hash
    end

    test "does not update password when new password is blank", %{conn: conn} do
      user = insert_user_with_password()

      conn =
        conn
        |> put_session(:user_id, user.id)
        |> patch("/api/v1/settings/password", %{
          "current_password" => @old_password,
          "password" => "   ",
          "password_confirmation" => "   "
        })

      response = json_response(conn, 422)

      assert "can't be blank" in response["errors"]["password"]

      updated = Repo.get!(User, user.id)

      assert updated.password_hash == user.password_hash
    end

    test "does not update password when current password is wrong", %{conn: conn} do
      user = insert_user_with_password()

      conn =
        conn
        |> put_session(:user_id, user.id)
        |> patch("/api/v1/settings/password", %{
          "current_password" => "wrong-password",
          "password" => @new_password,
          "password_confirmation" => @new_password
        })

      assert json_response(conn, 422) == %{"errors" => %{"current_password" => ["is invalid"]}}

      updated = Repo.get!(User, user.id)

      assert updated.password_hash == user.password_hash
    end

    test "rejects guest request", %{conn: conn} do
      conn =
        patch(conn, "/api/v1/settings/password", %{
          "current_password" => @old_password,
          "password" => @new_password,
          "password_confirmation" => @new_password
        })

      assert json_response(conn, 401) == %{"error" => "oiblz"}
    end
  end

  defp insert_user_with_password do
    insert(:user, %{
      github_id: nil,
      github_name: nil,
      discord_id: nil,
      discord_name: nil,
      password_hash: Bcrypt.hash_pwd_salt(@old_password)
    })
  end
end
