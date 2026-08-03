defmodule Codebattle.Auth.User.FirebaseUserTest do
  use Codebattle.DataCase, async: true

  alias Codebattle.Auth.User, as: AuthUser
  alias Codebattle.Auth.User.FirebaseUser

  setup {Req.Test, :verify_on_exit!}

  test "synchronizes the local email after a verified Firebase sign-in" do
    user = insert(:user, email: "old@example.com", firebase_uid: "firebase-123")

    Req.Test.expect(FirebaseUser, 2, fn conn ->
      case conn.request_path do
        "/v1/accounts:signInWithPassword" ->
          Req.Test.json(conn, %{
            "idToken" => "fresh-token",
            "localId" => "firebase-123"
          })

        "/v1/accounts:lookup" ->
          Req.Test.json(conn, %{
            "users" => [
              %{
                "displayName" => user.name,
                "email" => "new@example.com",
                "emailVerified" => true
              }
            ]
          })
      end
    end)

    assert {:ok, signed_in_user} =
             AuthUser.find_by_firebase(%{
               email: "new@example.com",
               password: "firebase-password"
             })

    assert signed_in_user.id == user.id
    assert signed_in_user.email == "new@example.com"
    assert Repo.get!(User, user.id).email == "new@example.com"
  end

  test "creates a new account when a Firebase identity returns after archival" do
    archived_user =
      insert(:user,
        archived_at: DateTime.utc_now(:second),
        name: "archived-randomname",
        email: nil,
        firebase_uid: nil
      )

    Req.Test.expect(FirebaseUser, 2, fn conn ->
      case conn.request_path do
        "/v1/accounts:signInWithPassword" ->
          Req.Test.json(conn, %{
            "idToken" => "fresh-token",
            "localId" => "returning-firebase-id"
          })

        "/v1/accounts:lookup" ->
          Req.Test.json(conn, %{
            "users" => [
              %{
                "displayName" => "OriginalName",
                "email" => "owner@example.com",
                "emailVerified" => true
              }
            ]
          })
      end
    end)

    assert {:ok, new_user} =
             AuthUser.find_by_firebase(%{
               email: "owner@example.com",
               password: "firebase-password"
             })

    refute new_user.id == archived_user.id
    assert new_user.firebase_uid == "returning-firebase-id"
    assert new_user.name == "OriginalName"

    archived = Repo.get!(User, archived_user.id)
    assert archived.name == "archived-randomname"
    assert archived.email == nil
    assert archived.firebase_uid == nil
  end
end
