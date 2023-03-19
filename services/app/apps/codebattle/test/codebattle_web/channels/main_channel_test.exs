defmodule CodebattleWeb.MainChannelTest do
  use CodebattleWeb.ChannelCase

  alias CodebattleWeb.MainChannel
  alias CodebattleWeb.UserSocket
  alias CodebattleWeb.Presence

  setup do
    creator = insert(:user)
    recipient = insert(:user)

    creator_token = Phoenix.Token.sign(socket(UserSocket), "user_token", creator.id)
    recipient_token = Phoenix.Token.sign(socket(UserSocket), "user_token", recipient.id)
    {:ok, creator_socket} = connect(UserSocket, %{"token" => creator_token})
    {:ok, recipient_socket} = connect(UserSocket, %{"token" => recipient_token})

    {:ok,
     %{
       creator: creator,
       creator_socket: creator_socket,
       recipient: recipient,
       recipient_socket: recipient_socket
     }}
  end

  test "on connect pushes presence statte", %{creator_socket: creator_socket} do
    {:ok, response, socket} = subscribe_and_join(creator_socket, MainChannel, "main")

    assert response == %{}

    list = Presence.list(socket)

    assert_receive %Phoenix.Socket.Message{
      topic: "main",
      event: "presence_state",
      payload: payload
    }

    assert list == payload
  end
end
