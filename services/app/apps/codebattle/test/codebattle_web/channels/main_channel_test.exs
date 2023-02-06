defmodule CodebattleWeb.MainChannelTest do
  # use CodebattleWeb.ChannelCase, async: true
  use CodebattleWeb.ChannelCase

  alias CodebattleWeb.MainChannel
  alias CodebattleWeb.UserSocket
  alias CodebattleWeb.Presence

  setup do
    creator = insert(:user)
    recipient = insert(:user)
    insert(:task, level: "elementary")
    insert(:task, level: "elementary")

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

  test "on connect pushes initial invites", %{creator_socket: creator_socket} do
    {:ok, response, socket} = subscribe_and_join(creator_socket, MainChannel, "main")

    assert response == %{}

    assert_receive %Phoenix.Socket.Message{
      topic: "main",
      event: "invites:init",
      payload: response
    }

    assert response == %{invites: []}

    list = Presence.list(socket)

    assert_receive %Phoenix.Socket.Message{
      topic: "main",
      event: "presence_state",
      payload: payload
    }

    assert list == payload
  end

  test "on connect pushes and filters initial invites", %{
    creator: creator,
    creator_socket: creator_socket
  } do
    insert(:invite, creator: creator)
    insert(:invite, creator: insert(:user))
    insert(:invite, recipient: creator)

    {:ok, response, _socket} = subscribe_and_join(creator_socket, MainChannel, "main")

    assert response == %{}

    assert_receive %Phoenix.Socket.Message{
      topic: "main",
      event: "invites:init",
      payload: response
    }

    assert Enum.count(response.invites) == 2
  end

  test "creates invite", %{
    creator: creator,
    creator_socket: creator_socket,
    recipient: recipient,
    recipient_socket: recipient_socket
  } do
    {:ok, _response, creator_socket} = subscribe_and_join(creator_socket, MainChannel, "main")

    {:ok, _response, _recipient_socket} =
      subscribe_and_join(recipient_socket, MainChannel, "main")

    response_ref = push(creator_socket, "invites:create", %{recipient_id: recipient.id})

    assert_receive %Phoenix.Socket.Reply{
      topic: "main",
      ref: ^response_ref,
      payload: response
    }

    assert response.invite.id
    assert response.invite.creator_id == creator.id
    assert response.invite.recipient_id == recipient.id

    assert_receive %Phoenix.Socket.Message{
      topic: "main",
      event: "invites:created",
      payload: response
    }

    assert response.invite.id
    assert response.invite.creator_id == creator.id
    assert response.invite.recipient_id == recipient.id
  end

  test "creates and accept invite", %{
    creator: creator,
    creator_socket: creator_socket,
    recipient: recipient,
    recipient_socket: recipient_socket
  } do
    {:ok, _response, _creator_socket} = subscribe_and_join(creator_socket, MainChannel, "main")

    {:ok, _response, recipient_socket} = subscribe_and_join(recipient_socket, MainChannel, "main")

    invite = insert(:invite, creator: creator, recipient: recipient, game_params: %{})

    response_ref = push(recipient_socket, "invites:accept", %{"id" => invite.id})

    assert_receive %Phoenix.Socket.Reply{
      topic: "main",
      ref: ^response_ref,
      payload: response
    }

    assert response.invite.id
    assert response.invite.state == "accepted"
    assert response.invite.creator_id == creator.id
    assert response.invite.recipient_id == recipient.id

    assert_receive %Phoenix.Socket.Broadcast{
      topic: "main",
      payload: _response
    }
  end

  test "creates and cancel invite", %{
    creator: creator,
    creator_socket: creator_socket,
    recipient: recipient,
    recipient_socket: recipient_socket
  } do
    {:ok, _response, creator_socket} = subscribe_and_join(creator_socket, MainChannel, "main")

    {:ok, _response, recipient_socket} = subscribe_and_join(recipient_socket, MainChannel, "main")

    creator_invite = insert(:invite, creator: creator, recipient: recipient, game_params: %{})
    recipient_invite = insert(:invite, creator: creator, recipient: recipient, game_params: %{})

    recipient_response_ref =
      push(recipient_socket, "invites:cancel", %{"id" => creator_invite.id})

    assert_receive %Phoenix.Socket.Reply{
      topic: "main",
      ref: ^recipient_response_ref,
      payload: response
    }

    assert response.invite.id
    assert response.invite.state == "canceled"
    assert response.invite.creator_id == creator.id
    assert response.invite.recipient_id == recipient.id

    assert_receive %Phoenix.Socket.Broadcast{
      topic: "main",
      payload: _response
    }

    ## Creator cancels invite
    creator_response_ref = push(creator_socket, "invites:cancel", %{"id" => recipient_invite.id})

    assert_receive %Phoenix.Socket.Reply{
      topic: "main",
      ref: ^creator_response_ref,
      payload: response
    }

    assert response.invite.id
    assert response.invite.state == "canceled"
    assert response.invite.creator_id == creator.id
    assert response.invite.recipient_id == recipient.id

    assert_receive %Phoenix.Socket.Broadcast{
      topic: "main",
      payload: _response
    }
  end
end
