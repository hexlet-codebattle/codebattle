defmodule Codebattle.User.DataExportTest do
  use Codebattle.DataCase, async: true

  alias Codebattle.User.DataExport
  alias Codebattle.UserSession

  test "collects the user's records without credentials or other users' data" do
    user =
      insert(:user,
        name: "Exporter",
        email: "exporter@example.com",
        auth_token: "secret-auth-token",
        password_hash: Bcrypt.hash_pwd_salt("secret-password!")
      )

    {:ok, _session, _token} = UserSession.create(user, %{ip: "203.0.113.7", user_agent: "Firefox"})
    {:ok, _session, _token} = UserSession.create(insert(:user), %{ip: "198.51.100.9"})
    insert(:feedback, user_id: user.id, text: "my feedback")

    json = user |> DataExport.build() |> Jason.encode!()
    export = Jason.decode!(json)

    assert export["profile"]["name"] == "Exporter"
    assert export["profile"]["email"] == "exporter@example.com"
    refute Map.has_key?(export["profile"], "password_hash")
    refute Map.has_key?(export["profile"], "auth_token")
    assert [%{"ip" => "203.0.113.7", "user_agent" => "Firefox"} = session] = export["sessions"]
    refute Map.has_key?(session, "token_hash")
    assert [%{"text" => "my feedback"}] = export["feedback"]
    assert export["games"] == []
    refute json =~ "secret-auth-token"
    refute json =~ "198.51.100.9"
  end
end
