defmodule CodebattleWeb.MainChannelTest do
  use CodebattleWeb.ChannelCase, async: true

  alias CodebattleWeb.MainChannel
  alias Codebattle.Invite
  alias CodebattleWeb.UserSocket

  setup do
    creator = insert(:user)
    recepient = insert(:user)
    insert(:task, level: "elementary")
    insert(:task, level: "elementary")

    creator_token = Phoenix.Token.sign(socket(UserSocket), "user_token", creator.id)
    recepient_token = Phoenix.Token.sign(socket(UserSocket), "user_token", recepient.id)
    {:ok, creator_socket} = connect(UserSocket, %{"token" => creator_token})
    {:ok, recepient_socket} = connect(UserSocket, %{"token" => recepient_token})

    {:ok,
     %{
       creator: creator,
       creator_socket: creator_socket,
       recepient: recepient,
       recepient_socket: recepient_socket
     }}
  end

  test "on connect pushes initial invites", %{creator_socket: creator_socket, creator: creator} do
    {:ok, response, _socket} =
      subscribe_and_join(creator_socket, MainChannel, "main:#{creator.id}")

    assert response == %{}
    topic = topic_name(creator.id)

    assert_receive %Phoenix.Socket.Message{
      topic: ^topic,
      event: "invites:init",
      payload: response
    }

    assert response == %{invites: []}
  end

  test "on connect pushes and filters initial invites", %{
    creator: creator,
    creator_socket: creator_socket
  } do
    insert(:invite, creator: creator)
    insert(:invite, creator: insert(:user))
    insert(:invite, recepient: creator)

    {:ok, response, _socket} =
      subscribe_and_join(creator_socket, MainChannel, "main:#{creator.id}")

    assert response == %{}

    topic = topic_name(creator.id)

    assert_receive %Phoenix.Socket.Message{
      topic: ^topic,
      event: "invites:init",
      payload: response
    }

    assert Enum.count(response.invites) == 2
  end

  test "creates invite", %{
    creator: creator,
    creator_socket: creator_socket,
    recepient: recepient,
    recepient_socket: recepient_socket
  } do
    {:ok, response, creator_socket} =
      subscribe_and_join(creator_socket, MainChannel, "main:#{creator.id}")

    {:ok, response, recepient_socket} =
      subscribe_and_join(recepient_socket, MainChannel, "main:#{recepient.id}")

    response_ref = push(creator_socket, "invites:create", %{recepient_id: recepient.id})

    topic = topic_name(creator.id)

    assert_receive %Phoenix.Socket.Reply{
      topic: ^topic,
      ref: ^response_ref,
      payload: response
    }

    assert response.invite.id
    assert response.invite.state == "pending"
    assert response.invite.creator_id == creator.id
    assert response.invite.recepient_id == recepient.id

    topic = topic_name(recepient.id)

    assert_receive %Phoenix.Socket.Broadcast{
      topic: ^topic,
      payload: response
    }

    assert response.invite.id
    assert response.invite.state == "pending"
    assert response.invite.creator_id == creator.id
    assert response.invite.recepient_id == recepient.id
  end

  test "creates and accept invite", %{
    creator: creator,
    creator_socket: creator_socket,
    recepient: recepient,
    recepient_socket: recepient_socket
  } do
    {:ok, response, creator_socket} =
      subscribe_and_join(creator_socket, MainChannel, "main:#{creator.id}")

    {:ok, response, recepient_socket} =
      subscribe_and_join(recepient_socket, MainChannel, "main:#{recepient.id}")

    invite = insert(:invite, creator: creator, recepient: recepient, game_params: %{})

    response_ref = push(recepient_socket, "invites:accept", %{"id" => invite.id})
    topic = topic_name(recepient.id)

    assert_receive %Phoenix.Socket.Reply{
      topic: ^topic,
      ref: ^response_ref,
      payload: response
    }

    assert response.invite.id
    assert response.invite.state == "accepted"
    assert response.invite.creator_id == creator.id
    assert response.invite.recepient_id == recepient.id

    assert_receive %Phoenix.Socket.Broadcast{
      topic: ^topic,
      payload: response
    }
  end

  test "creates and cancel invite", %{
    creator: creator,
    creator_socket: creator_socket,
    recepient: recepient,
    recepient_socket: recepient_socket
  } do
    {:ok, response, creator_socket} =
      subscribe_and_join(creator_socket, MainChannel, "main:#{creator.id}")

    {:ok, response, recepient_socket} =
      subscribe_and_join(recepient_socket, MainChannel, "main:#{recepient.id}")

    creator_invite = insert(:invite, creator: creator, recepient: recepient, game_params: %{})
    recepient_invite = insert(:invite, creator: creator, recepient: recepient, game_params: %{})

    recepient_response_ref =
      push(recepient_socket, "invites:cancel", %{"id" => creator_invite.id})

    creator_topic = topic_name(creator.id)
    recepient_topic = topic_name(recepient.id)

    assert_receive %Phoenix.Socket.Reply{
      topic: ^recepient_topic,
      ref: ^recepient_response_ref,
      payload: response
    }

    assert response.invite.id
    assert response.invite.state == "cancelled"
    assert response.invite.creator_id == creator.id
    assert response.invite.recepient_id == recepient.id

    assert_receive %Phoenix.Socket.Broadcast{
      topic: ^creator_topic,
      payload: response
    }

    ## Creator cancel invite to himself
    creator_response_ref = push(creator_socket, "invites:cancel", %{"id" => recepient_invite.id})

    assert_receive %Phoenix.Socket.Reply{
      topic: ^creator_topic,
      ref: ^creator_response_ref,
      payload: response
    }

    assert response.invite.id
    assert response.invite.state == "cancelled"
    assert response.invite.creator_id == creator.id
    assert response.invite.recepient_id == recepient.id

    assert_receive %Phoenix.Socket.Broadcast{
      topic: ^recepient_topic,
      payload: response
    }
  end

  defp topic_name(user_id) do
    "main:#{user_id}"
  end
end
