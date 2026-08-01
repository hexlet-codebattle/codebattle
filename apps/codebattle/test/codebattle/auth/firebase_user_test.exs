defmodule Codebattle.Auth.User.FirebaseUserTest do
  use Codebattle.DataCase, async: true

  alias Codebattle.Auth.User, as: AuthUser

  setup {Req.Test, :verify_on_exit!}

  test "synchronizes the local email after a verified Firebase sign-in" do
    user = insert(:user, email: "old@example.com", firebase_uid: "firebase-123")

    Req.Test.expect(Codebattle.Auth.User.FirebaseUser, 2, fn conn ->
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
end
