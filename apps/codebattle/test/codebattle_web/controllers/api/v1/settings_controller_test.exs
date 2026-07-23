defmodule CodebattleWeb.Api.V1.SettingsControllerTest do
  use CodebattleWeb.ConnCase, async: false

  alias Codebattle.Repo
  alias Codebattle.User
  alias Codebattle.UserSession

  @old_password "old-password-secure!"
  @new_password "new-password-secure!"

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
        |> log_in_user(user.id)
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
        |> log_in_user(user.id)
        |> patch(Routes.api_v1_settings_path(conn, :update, new_settings))

      assert json_response(conn, 200) ==
               new_settings
               |> Map.put("clan", "Bca")
               |> Map.put("has_password", false)
               |> Map.put("can_unlink_social", true)

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
        |> log_in_user(user.id)
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
        |> log_in_user(user.id)
        |> patch(Routes.api_v1_settings_path(conn, :show, new_settings))

      assert json_response(conn, 422) == %{"errors" => %{"name" => ["has already been taken"]}}
    end
  end

  describe "#update_password" do
    test "updates the password, rotates the session, and rejects the previous password", %{conn: conn} do
      user = insert_user_with_password()
      conn = log_in_user(conn, user, %{user_agent: "Current browser", ip: "127.0.0.1"})
      previous_token = get_session(conn, :user_session_token)
      current_session = UserSession.get_active_by_token(previous_token)
      {:ok, other_session, other_token} = UserSession.create(user, %{user_agent: "Other browser"})

      conn =
        patch(conn, "/api/v1/settings/password", %{
          "current_password" => @old_password,
          "password" => @new_password,
          "password_confirmation" => @new_password
        })

      assert json_response(conn, 200) == %{"status" => "ok", "has_password" => true}

      renewed_token = get_session(conn, :user_session_token)
      renewed_session = UserSession.get_active_by_token(renewed_token)

      refute renewed_token == previous_token
      assert renewed_session.id == current_session.id
      assert renewed_session.user_agent == "Current browser"
      assert UserSession.get_active_by_token(previous_token) == nil
      assert UserSession.get_active_by_token(other_token) == nil
      assert Repo.get!(UserSession, other_session.id).revoked_at
      assert %User{id: user_id} = User.authenticate(user.name, @new_password)
      assert user_id == user.id
      refute User.authenticate(user.name, @old_password)
    end

    test "rejects an invalid current password and passwords outside bcrypt limits", %{conn: conn} do
      user = insert_user_with_password()
      conn = log_in_user(conn, user.id)

      invalid_current_password =
        patch(conn, "/api/v1/settings/password", %{
          "current_password" => "wrong-password",
          "password" => @new_password,
          "password_confirmation" => @new_password
        })

      assert json_response(invalid_current_password, 422) == %{
               "errors" => %{"current_password" => ["is invalid"]}
             }

      too_short =
        patch(conn, "/api/v1/settings/password", %{
          "current_password" => @old_password,
          "password" => "too-short",
          "password_confirmation" => "too-short"
        })

      assert "should be at least 12 character(s)" in json_response(too_short, 422)["errors"]["password"]

      over_bcrypt_limit = String.duplicate("é", 37)

      too_long =
        patch(conn, "/api/v1/settings/password", %{
          "current_password" => @old_password,
          "password" => over_bcrypt_limit,
          "password_confirmation" => over_bcrypt_limit
        })

      assert "should be at most 72 bytes" in json_response(too_long, 422)["errors"]["password"]
      assert Repo.get!(User, user.id).password_hash == user.password_hash
    end

    test "rate limits repeated failed password changes", %{conn: conn} do
      user = insert_user_with_password()
      conn = log_in_user(conn, user.id)

      Enum.each(1..5, fn _attempt ->
        response =
          patch(conn, "/api/v1/settings/password", %{
            "current_password" => "wrong-password",
            "password" => @new_password,
            "password_confirmation" => @new_password
          })

        assert response.status == 422
      end)

      response =
        patch(conn, "/api/v1/settings/password", %{
          "current_password" => @old_password,
          "password" => @new_password,
          "password_confirmation" => @new_password
        })

      assert json_response(response, 429) == %{
               "errors" => %{"current_password" => ["too many attempts, try again later"]}
             }
    end
  end

  describe "#sessions" do
    test "lists active sessions and marks the current one", %{conn: conn} do
      user = insert(:user)
      conn = log_in_user(conn, user, %{user_agent: "Current browser", ip: "127.0.0.1"})
      {:ok, other_session, _token} = UserSession.create(user, %{user_agent: "Other browser", ip: "10.0.0.2"})

      conn = get(conn, "/api/v1/settings/sessions")
      sessions = json_response(conn, 200)["sessions"]

      assert length(sessions) == 2

      assert %{"current" => true, "user_agent" => "Current browser", "ip" => "127.0.0.1"} =
               Enum.find(sessions, & &1["current"])

      other_session_id = other_session.id

      assert %{"current" => false, "id" => ^other_session_id, "user_agent" => "Other browser"} =
               Enum.find(sessions, &(&1["id"] == other_session.id))
    end

    test "revokes another session but cannot revoke another user's session", %{conn: conn} do
      user = insert(:user)
      other_user = insert(:user)
      conn = log_in_user(conn, user)
      {:ok, session, raw_token} = UserSession.create(user)
      {:ok, foreign_session, _foreign_token} = UserSession.create(other_user)

      response = delete(conn, "/api/v1/settings/sessions/#{session.id}")

      assert json_response(response, 200) == %{"status" => "ok", "current" => false}
      assert UserSession.get_active_by_token(raw_token) == nil

      response = delete(conn, "/api/v1/settings/sessions/#{foreign_session.id}")
      assert json_response(response, 404) == %{"error" => "session not found"}
    end

    test "revokes the current session and drops its cookie", %{conn: conn} do
      user = insert(:user)
      conn = log_in_user(conn, user)
      token = get_session(conn, :user_session_token)
      session = UserSession.get_active_by_token(token)

      conn = delete(conn, "/api/v1/settings/sessions/#{session.id}")

      assert json_response(conn, 200) == %{"status" => "ok", "current" => true}
      assert get_session(conn, :user_session_token) == nil
      assert UserSession.get_active_by_token(token) == nil
    end
  end

  defp insert_user_with_password do
    insert(:user, password_hash: Bcrypt.hash_pwd_salt(@old_password))
  end
end
