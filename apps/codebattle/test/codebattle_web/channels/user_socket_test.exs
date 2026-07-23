defmodule CodebattleWeb.UserSocketTest do
  use CodebattleWeb.ChannelCase, async: true

  alias CodebattleWeb.UserSocket

  test "connect assigns access_token from socket params" do
    user = insert(:user)
    user_token = user_socket_token(user)

    assert {:ok, socket} =
             connect(UserSocket, %{"token" => user_token, "access_token" => "secret-token"})

    assert socket.assigns.access_token == "secret-token"
  end

  test "connect ignores blank access_token" do
    user = insert(:user)
    user_token = user_socket_token(user)

    assert {:ok, socket} = connect(UserSocket, %{"token" => user_token, "access_token" => "  "})

    assert socket.assigns.access_token == nil
  end

  test "connect accepts only an active user session" do
    user = insert(:user)
    {:ok, session, _raw_token} = Codebattle.UserSession.create(user)
    current_token = Phoenix.Token.sign(socket(UserSocket), "user_token", {user.id, session.id})

    assert {:ok, socket} = connect(UserSocket, %{"token" => current_token})
    assert socket.assigns.current_user.id == user.id
    assert UserSocket.id(socket) == "user_session:#{session.id}"

    {:ok, _revoked_session} = Codebattle.UserSession.revoke_for_user(user.id, session.id)
    assert :error = connect(UserSocket, %{"token" => current_token})
  end

  test "rejects legacy user id tokens" do
    user = insert(:user)
    legacy_token = Phoenix.Token.sign(socket(UserSocket), "user_token", user.id)

    assert :error = connect(UserSocket, %{"token" => legacy_token})
  end
end
