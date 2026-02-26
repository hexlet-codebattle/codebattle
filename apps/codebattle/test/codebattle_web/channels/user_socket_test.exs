defmodule CodebattleWeb.UserSocketTest do
  use CodebattleWeb.ChannelCase, async: true

  alias CodebattleWeb.UserSocket

  test "connect assigns access_token from socket params" do
    user = insert(:user)
    user_token = Phoenix.Token.sign(socket(UserSocket), "user_token", user.id)

    assert {:ok, socket} =
             connect(UserSocket, %{"token" => user_token, "access_token" => "secret-token"})

    assert socket.assigns.access_token == "secret-token"
  end

  test "connect ignores blank access_token" do
    user = insert(:user)
    user_token = Phoenix.Token.sign(socket(UserSocket), "user_token", user.id)

    assert {:ok, socket} = connect(UserSocket, %{"token" => user_token, "access_token" => "  "})

    assert socket.assigns.access_token == nil
  end
end
