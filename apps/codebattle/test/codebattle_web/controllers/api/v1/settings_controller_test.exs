defmodule CodebattleWeb.Api.V1.SettingsControllerTest do
  use CodebattleWeb.ConnCase, async: false

  alias Codebattle.Auth.User.FirebaseUser
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
               "email" => "test1@test.test",
               "has_firebase_auth" => false,
               "name" => "first",
               "lang" => "dart",
               "locale" => "en",
               "clan" => "abc",
               "discord_id" => 5_246_840,
               "discord_name" => "discord_name782",
               "sound_settings" => %{
                 "level" => 7,
                 "muted" => false,
                 "tournament_level" => 7,
                 "type" => "dendy"
               },
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
        "sound_settings" => %{
          "level" => 3,
          "muted" => true,
          "tournament_level" => 8,
          "type" => "cs"
        },
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
      assert updated.sound_settings.muted
      assert updated.sound_settings.tournament_level == 8
      assert updated.sound_settings.type == "cs"
      assert updated.clan == "Bca"
      assert updated.clan_id == clan.id
      assert updated.name == "evgen"
      assert updated.lang == "ruby"
      assert updated.locale == "ru"
    end

    test "updates only the mute preference", %{conn: conn} do
      user = insert(:user, sound_settings: %User.SoundSettings{level: 3, type: "cs"})

      conn =
        conn
        |> log_in_user(user.id)
        |> patch(
          Routes.api_v1_settings_path(conn, :update, %{
            "sound_settings" => %{"muted" => true}
          })
        )

      assert %{"muted" => true} = json_response(conn, 200)["sound_settings"]

      updated = Repo.get!(User, user.id)
      assert updated.sound_settings.muted
      assert updated.sound_settings.level == 3
      assert updated.sound_settings.type == "cs"
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

  describe "#update_email" do
    setup {Req.Test, :verify_on_exit!}

    setup do
      Cachex.clear(:email_change_rate_limit_cache)
      :ok
    end

    test "reauthenticates in Firebase and sends verification to the new email", %{conn: conn} do
      user = insert(:user, email: "old@example.com", firebase_uid: "firebase-123")

      Req.Test.expect(FirebaseUser, 2, fn conn ->
        body = conn |> Req.Test.raw_body() |> Jason.decode!()

        case conn.request_path do
          "/v1/accounts:signInWithPassword" ->
            assert body == %{
                     "email" => "old@example.com",
                     "password" => "firebase-password",
                     "returnSecureToken" => true
                   }

            Req.Test.json(conn, %{"idToken" => "fresh-token", "localId" => "firebase-123"})

          "/v1/accounts:sendOobCode" ->
            assert body == %{
                     "idToken" => "fresh-token",
                     "newEmail" => "new@example.com",
                     "requestType" => "VERIFY_AND_CHANGE_EMAIL"
                   }

            Req.Test.json(conn, %{"email" => "new@example.com"})
        end
      end)

      conn =
        conn
        |> log_in_user(user.id)
        |> patch("/api/v1/settings/email", %{
          "email" => "new@example.com",
          "current_password" => "firebase-password"
        })

      assert json_response(conn, 200) == %{"status" => "verification_sent"}
      assert Repo.get!(User, user.id).email == "old@example.com"
    end

    test "rejects reauthentication for a different Firebase identity", %{conn: conn} do
      user = insert(:user, email: "owner@example.com", firebase_uid: "owner-firebase-uid")
      other_user = insert(:user, email: "victim@example.com", firebase_uid: "victim-firebase-uid")

      Req.Test.expect(FirebaseUser, 1, fn firebase_conn ->
        body = firebase_conn |> Req.Test.raw_body() |> Jason.decode!()

        assert firebase_conn.request_path == "/v1/accounts:signInWithPassword"
        assert body["email"] == "owner@example.com"

        Req.Test.json(firebase_conn, %{
          "idToken" => "victim-token",
          "localId" => "victim-firebase-uid"
        })
      end)

      response =
        conn
        |> log_in_user(user.id)
        |> patch("/api/v1/settings/email", %{
          "email" => "attacker-controlled@example.com",
          "current_password" => "victim-password",
          "firebase_uid" => other_user.firebase_uid,
          "user_id" => other_user.id
        })

      assert json_response(response, 422) == %{"errors" => %{"current_password" => ["is invalid"]}}
      assert Repo.get!(User, user.id).email == "owner@example.com"
      assert Repo.get!(User, other_user.id).email == "victim@example.com"
    end

    test "rejects an invalid Firebase password", %{conn: conn} do
      user = insert(:user, email: "old@example.com", firebase_uid: "firebase-123")

      Req.Test.expect(FirebaseUser, fn conn ->
        conn
        |> Plug.Conn.put_status(:bad_request)
        |> Req.Test.json(%{"error" => %{"message" => "INVALID_LOGIN_CREDENTIALS"}})
      end)

      conn =
        conn
        |> log_in_user(user.id)
        |> patch("/api/v1/settings/email", %{
          "email" => "new@example.com",
          "current_password" => "wrong-password"
        })

      assert json_response(conn, 422) == %{"errors" => %{"current_password" => ["is invalid"]}}
    end

    test "does not reveal when Firebase reports that the new email exists", %{conn: conn} do
      user = insert(:user, email: "old@example.com", firebase_uid: "firebase-123")

      Req.Test.expect(FirebaseUser, 2, fn firebase_conn ->
        case firebase_conn.request_path do
          "/v1/accounts:signInWithPassword" ->
            Req.Test.json(firebase_conn, %{"idToken" => "fresh-token", "localId" => "firebase-123"})

          "/v1/accounts:sendOobCode" ->
            firebase_conn
            |> Plug.Conn.put_status(:bad_request)
            |> Req.Test.json(%{"error" => %{"message" => "EMAIL_EXISTS"}})
        end
      end)

      response =
        conn
        |> log_in_user(user.id)
        |> patch("/api/v1/settings/email", %{
          "email" => "registered@example.com",
          "current_password" => "firebase-password"
        })

      assert json_response(response, 422) == %{
               "errors" => %{"base" => ["Unable to send the verification email. Please try again later."]}
             }
    end

    test "limits successful verification requests for an account", %{conn: conn} do
      user = insert(:user, email: "old@example.com", firebase_uid: "firebase-123")

      Req.Test.stub(FirebaseUser, fn firebase_conn ->
        case firebase_conn.request_path do
          "/v1/accounts:signInWithPassword" ->
            Req.Test.json(firebase_conn, %{"idToken" => "fresh-token", "localId" => "firebase-123"})

          "/v1/accounts:sendOobCode" ->
            Req.Test.json(firebase_conn, %{})
        end
      end)

      logged_in_conn = log_in_user(conn, user.id)

      Enum.each(1..3, fn attempt ->
        response =
          patch(logged_in_conn, "/api/v1/settings/email", %{
            "email" => "new#{attempt}@example.com",
            "current_password" => "firebase-password"
          })

        assert json_response(response, 200) == %{"status" => "verification_sent"}
      end)

      response =
        patch(logged_in_conn, "/api/v1/settings/email", %{
          "email" => "new4@example.com",
          "current_password" => "firebase-password"
        })

      assert json_response(response, 429) == %{
               "errors" => %{"base" => ["Too many attempts. Please try again later."]}
             }
    end

    test "validates the email and requires Firebase authentication", %{conn: conn} do
      user = insert(:user, email: "old@example.com", firebase_uid: nil)

      invalid_email =
        conn
        |> log_in_user(user.id)
        |> patch("/api/v1/settings/email", %{
          "email" => "not-an-email",
          "current_password" => "password"
        })

      assert json_response(invalid_email, 422) == %{"errors" => %{"email" => ["is invalid"]}}

      unavailable =
        conn
        |> log_in_user(user.id)
        |> patch("/api/v1/settings/email", %{
          "email" => "new@example.com",
          "current_password" => "password"
        })

      assert json_response(unavailable, 422) == %{
               "errors" => %{"base" => ["Email sign-in is not available for this account"]}
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
