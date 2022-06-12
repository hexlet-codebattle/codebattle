defmodule Codebattle.ChatTest do
  use Codebattle.DataCase

  alias Codebattle.Chat

  @chat_type {:game, 198_419_841_984}

  setup do
    user1 = build(:user, name: "alice")
    user2 = build(:user, name: "bob")
    admin = build(:admin)

    {:ok, %{user1: user1, user2: user2, admin: admin}}
  end

  test "works", %{user1: %{id: user_id, name: name} = user1} do
    {:ok, _pid} = Chat.start_link(@chat_type, %{clean_timeout: 50, message_ttl: 10})

    assert %{messages: [], users: [^user1]} = Chat.join_chat(@chat_type, user1)

    assert :ok =
             Chat.add_message(@chat_type, %{type: :text, text: "oi", user_id: user_id, name: name})

    assert [
             %Codebattle.Chat.Message{
               id: 1,
               name: ^name,
               text: "oi",
               time: _,
               type: :text,
               user_id: ^user_id
             }
           ] = Chat.get_messages(@chat_type)

    assert [^user1] = Chat.get_users(@chat_type)
    assert [] = Chat.leave_chat(@chat_type, user1)
    assert [] = Chat.get_users(@chat_type)
  end

  test "cleans messages periodically", %{user1: user1, user2: user2} do
    {:ok, _pid} = Chat.start_link(@chat_type, %{clean_timeout: 50, message_ttl: 10})

    Chat.add_message(@chat_type, %{type: :text, text: "oi", user_id: user1.id, name: user1.name})

    Chat.add_message(@chat_type, %{type: :text, text: "blz", user_id: user2.id, name: user2.name})

    assert length(Chat.get_messages(@chat_type)) == 2
    :timer.sleep(100)
    assert length(Chat.get_messages(@chat_type)) == 0
  end

  test "deletes messages and bans user", %{user1: user1, user2: user2, admin: admin} do
    {:ok, _pid} = Chat.start_link(@chat_type, %{clean_timeout: 50, message_ttl: 10})

    Chat.join_chat(@chat_type, user1)
    Chat.join_chat(@chat_type, user2)
    Chat.join_chat(@chat_type, admin)

    Chat.add_message(@chat_type, %{type: :text, text: "oi", user_id: user1.id, name: user1.name})
    Chat.add_message(@chat_type, %{type: :text, text: "blz", user_id: user2.id, name: user2.name})
    Chat.add_message(@chat_type, %{type: :text, text: "bom", user_id: admin.id, name: admin.name})

    assert length(Chat.get_messages(@chat_type)) == 3

    :ok =
      Chat.ban_user(@chat_type, %{admin_name: admin.name, user_id: user1.id, name: user1.name})

    assert [
             %Codebattle.Chat.Message{id: 2, name: "bob", text: "blz", type: :text},
             %Codebattle.Chat.Message{id: 3, name: "admin", text: "bom", type: :text},
             %Codebattle.Chat.Message{id: 4, text: "alice has been banned by admin", type: :info}
           ] = Chat.get_messages(@chat_type)

    Chat.add_message(@chat_type, %{type: :text, text: "oi", user_id: user1.id, name: user1.name})
    Chat.add_message(@chat_type, %{type: :text, text: "blz", user_id: user2.id, name: user2.name})

    assert length(Chat.get_messages(@chat_type)) == 4
    :ok = Chat.clean_banned(@chat_type)

    Chat.add_message(@chat_type, %{type: :text, text: "oi", user_id: user1.id, name: user1.name})
    Chat.add_message(@chat_type, %{type: :text, text: "blz", user_id: user2.id, name: user2.name})

    assert length(Chat.get_messages(@chat_type)) == 6
  end

  test "catches no_chat error", %{user1: %{id: user_id, name: name} = user1} do
    assert %{messages: [], users: []} = Chat.join_chat(@chat_type, user1)
    assert [] = Chat.leave_chat(@chat_type, user1)

    assert :ok =
             Chat.add_message(@chat_type, %{type: :text, text: "oi", user_id: user_id, name: name})

    assert [] = Chat.get_messages(@chat_type)
    assert [] = Chat.get_users(@chat_type)
    assert :ok = Chat.ban_user(@chat_type, %{admin_name: name, user_id: user_id, name: name})
    assert :ok = Chat.clean_banned(@chat_type)
  end
end
