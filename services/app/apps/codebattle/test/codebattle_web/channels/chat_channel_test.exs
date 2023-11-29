defmodule CodebattleWeb.ChatChannelTest do
  use CodebattleWeb.ChannelCase, async: true

  alias CodebattleWeb.ChatChannel
  alias Codebattle.Chat
  alias CodebattleWeb.UserSocket

  setup do
    user1 = insert(:user, name: "alice")
    user2 = insert(:user, name: "bob")
    admin = insert(:admin)

    user_token1 = Phoenix.Token.sign(socket(UserSocket), "user_token", user1.id)
    {:ok, socket1} = connect(UserSocket, %{"token" => user_token1})

    user_token2 = Phoenix.Token.sign(socket(UserSocket), "user_token", user2.id)
    {:ok, socket2} = connect(UserSocket, %{"token" => user_token2})

    admin_token = Phoenix.Token.sign(socket(UserSocket), "user_token", admin.id)
    {:ok, admin_socket} = connect(UserSocket, %{"token" => admin_token})

    {:ok,
     %{user1: user1, user2: user2, socket1: socket1, socket2: socket2, admin_socket: admin_socket}}
  end

  test "sends chat info when user join", %{user1: user1, socket1: socket1} do
    chat_id = :rand.uniform(1000)
    Chat.start_link({:game, chat_id})
    chat_topic = get_chat_topic(chat_id)

    {:ok, response, _socket1} = subscribe_and_join(socket1, ChatChannel, chat_topic)

    assert Jason.encode(response) ==
             Jason.encode(%{users: [Codebattle.User.get_user!(user1.id)], messages: []})
  end

  test "broadcasts chat:user_joined with state after user join", %{user2: user2, socket2: socket2} do
    chat_id = :rand.uniform(1000)
    Chat.start_link({:game, chat_id})
    chat_topic = get_chat_topic(chat_id)
    {:ok, _response, _socket2} = subscribe_and_join(socket2, ChatChannel, chat_topic)

    assert_receive %Phoenix.Socket.Broadcast{
      topic: ^chat_topic,
      event: "chat:user_joined",
      payload: response
    }

    assert Jason.encode(response) == Jason.encode(%{users: [Codebattle.User.get_user!(user2.id)]})
  end

  test "messaging process", %{user1: user1, socket1: socket1, socket2: socket2} do
    chat_id = :rand.uniform(1000)
    Chat.start_link({:game, chat_id})
    chat_topic = get_chat_topic(chat_id)
    {:ok, _response, socket1} = subscribe_and_join(socket1, ChatChannel, chat_topic)

    message = "oiblz"

    push(socket1, "chat:add_msg", %{text: message})

    :timer.sleep(100)

    assert_receive %Phoenix.Socket.Message{
      topic: ^chat_topic,
      event: "chat:new_msg",
      payload: response
    }

    id = user1.id
    assert %{name: "alice", user_id: ^id, text: ^message, time: _} = response

    {:ok, %{users: users, messages: messages}, _socket2} =
      subscribe_and_join(socket2, ChatChannel, chat_topic)

    assert length(users) == 2
    assert [%{name: "alice", user_id: ^id, text: ^message, time: _}] = messages
  end

  test "removes user from list on leaving channel", %{socket1: socket1, socket2: socket2} do
    chat_id = :rand.uniform(1000)
    Chat.start_link({:game, chat_id})
    chat_topic = get_chat_topic(chat_id)

    {:ok, _response, _socket1} = subscribe_and_join(socket1, ChatChannel, chat_topic)
    {:ok, response, socket2} = subscribe_and_join(socket2, ChatChannel, chat_topic)

    %{users: users} = response

    assert length(users) == 2

    leave(socket2)
    Process.unlink(socket2.channel_pid)
    :timer.sleep(100)

    assert_receive %Phoenix.Socket.Broadcast{
      topic: ^chat_topic,
      event: "chat:user_left",
      payload: response
    }

    %{users: users} = response

    assert length(users) == 1
  end

  test "bans user", %{
    socket1: socket1,
    user1: user1,
    socket2: socket2,
    admin_socket: admin_socket
  } do
    assert Chat.get_messages(:lobby) == []

    {:ok, _response, socket1} = subscribe_and_join(socket1, ChatChannel, "chat:lobby")
    {:ok, _response, socket2} = subscribe_and_join(socket2, ChatChannel, "chat:lobby")
    {:ok, _response, admin_socket} = subscribe_and_join(admin_socket, ChatChannel, "chat:lobby")

    push(socket1, "chat:add_msg", %{"text" => "oi"})
    :timer.sleep(10)
    push(socket2, "chat:add_msg", %{"text" => "blz"})
    :timer.sleep(10)
    push(socket1, "chat:add_msg", %{"text" => "invalid_content"})
    :timer.sleep(100)

    assert [
             %{id: 1, name: "alice", type: :text, text: "oi", time: _},
             %{id: 2, name: "bob", type: :text, text: "blz", time: _},
             %{id: 3, name: "alice", type: :text, text: "invalid_content", time: _}
           ] = Chat.get_messages(:lobby)

    # common user cannot ban users
    push(socket2, "chat:command", %{
      "type" => "ban",
      "user_id" => user1.id,
      "name" => user1.name
    })

    :timer.sleep(10)

    assert [
             %{name: "alice", type: :text, text: "oi", time: _},
             %{name: "bob", type: :text, text: "blz", time: _},
             %{name: "alice", type: :text, text: "invalid_content", time: _}
           ] = Chat.get_messages(:lobby)

    # only admin can ban users
    push(admin_socket, "chat:command", %{
      "type" => "ban",
      "user_id" => user1.id,
      "name" => user1.name
    })

    :timer.sleep(20)

    assert [
             %{name: "bob", type: :text, text: "blz", time: _},
             %{type: :info, text: "alice has been banned by admin", time: _}
           ] = Chat.get_messages(:lobby)
  end

  def get_chat_topic(id), do: "chat:g_#{id}"
end
