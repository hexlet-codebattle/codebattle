defmodule Codebattle.ChatTest do
  use Codebattle.DataCase

  alias Codebattle.Chat
  alias Codebattle.Chat.Message

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
             %Message{
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
    assert Enum.empty?(Chat.get_messages(@chat_type))
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
             %Message{id: 2, name: "bob", text: "blz", type: :text},
             %Message{id: 3, name: "admin", text: "bom", type: :text},
             %Message{id: 4, text: "alice has been banned by admin", type: :info}
           ] = Chat.get_messages(@chat_type)

    Chat.add_message(@chat_type, %{type: :text, text: "oi", user_id: user1.id, name: user1.name})
    Chat.add_message(@chat_type, %{type: :text, text: "blz", user_id: user2.id, name: user2.name})

    assert length(Chat.get_messages(@chat_type)) == 4
    :ok = Chat.clean_banned(@chat_type)

    Chat.add_message(@chat_type, %{type: :text, text: "oi", user_id: user1.id, name: user1.name})
    Chat.add_message(@chat_type, %{type: :text, text: "blz", user_id: user2.id, name: user2.name})

    assert length(Chat.get_messages(@chat_type)) == 6
  end

  test "deletes own message but not another user's message", %{user1: user1, user2: user2} do
    {:ok, _pid} = Chat.start_link(@chat_type, %{clean_timeout: 50, message_ttl: 10})

    Chat.add_message(@chat_type, %{type: :text, text: "oi", user_id: user1.id, name: user1.name})
    Chat.add_message(@chat_type, %{type: :text, text: "blz", user_id: user2.id, name: user2.name})

    assert [
             %Message{id: 1, user_id: user1_id},
             %Message{id: 2, user_id: user2_id}
           ] = Chat.get_messages(@chat_type)

    assert user1_id == user1.id
    assert user2_id == user2.id

    # cannot delete another user's message
    :ok = Chat.delete_message(@chat_type, 2, user1.id)
    assert length(Chat.get_messages(@chat_type)) == 2

    # cannot delete a non-existent message
    :ok = Chat.delete_message(@chat_type, 999, user1.id)
    assert length(Chat.get_messages(@chat_type)) == 2

    # can delete own message
    :ok = Chat.delete_message(@chat_type, 1, user1.id)

    assert [%Message{id: 2, text: "blz", user_id: ^user2_id}] = Chat.get_messages(@chat_type)
  end

  test "privileged user can delete any message", %{user1: user1, user2: user2, admin: admin} do
    {:ok, _pid} = Chat.start_link(@chat_type, %{clean_timeout: 50, message_ttl: 10})

    Chat.add_message(@chat_type, %{type: :text, text: "oi", user_id: user1.id, name: user1.name})
    Chat.add_message(@chat_type, %{type: :text, text: "blz", user_id: user2.id, name: user2.name})

    assert length(Chat.get_messages(@chat_type)) == 2

    # with can_delete_any? = true, a user may delete a message they do not own
    :ok = Chat.delete_message(@chat_type, 1, admin.id, true)

    assert [%Message{id: 2, text: "blz"}] = Chat.get_messages(@chat_type)
  end

  test "deletes a game's invites posted by its players", %{user1: user1, user2: user2} do
    {:ok, _pid} = Chat.start_link(@chat_type, %{clean_timeout: 50, message_ttl: 10})
    Codebattle.PubSub.subscribe("chat:game:#{elem(@chat_type, 1)}")

    invite = %{"type" => "general", "game_id" => 42}
    Chat.add_message(@chat_type, %{type: :text, text: "join 42", user_id: user1.id, name: user1.name, meta: invite})
    Chat.add_message(@chat_type, %{type: :text, text: "oi", user_id: user1.id, name: user1.name})
    Chat.add_message(@chat_type, %{type: :text, text: "fake 42", user_id: user2.id, name: user2.name, meta: invite})

    Chat.add_message(@chat_type, %{
      type: :text,
      text: "join 7",
      user_id: user1.id,
      name: user1.name,
      meta: %{"type" => "general", "game_id" => 7}
    })

    :ok = Chat.delete_game_messages(@chat_type, 42, [user1.id])

    assert_receive %{event: "chat:msg_deleted", payload: %{id: 1}}
    assert [%Message{text: "oi"}, %Message{text: "fake 42"}, %Message{text: "join 7"}] = Chat.get_messages(@chat_type)
  end

  test "copies message history with reactions and keeps chats independent", %{user1: alice, user2: bob} do
    target_chat = {:game, 198_419_841_985}
    {:ok, _pid} = Chat.start_link(@chat_type)
    {:ok, _pid} = Chat.start_link(target_chat)

    Chat.add_message(@chat_type, %{type: :text, text: "hello", user_id: alice.id, name: alice.name, lang: "elixir"})
    Chat.add_message(@chat_type, %{type: :text, text: "deleted", user_id: alice.id})

    Chat.add_message(@chat_type, %{
      type: :text,
      text: "secret",
      user_id: bob.id,
      name: bob.name,
      meta: %{"type" => "private", "target_user_id" => alice.id}
    })

    Chat.delete_message(@chat_type, 2, alice.id)
    Chat.react(@chat_type, 1, bob, "heart")
    Chat.react(@chat_type, 3, alice, "lang:elixir")
    Chat.add_message(target_chat, %{type: :info, text: "existing"})
    original_messages = Chat.get_messages(@chat_type)

    assert :ok = Chat.copy_messages(@chat_type, target_chat)
    assert [existing | copied_messages] = Chat.get_messages(target_chat)
    assert existing.text == "existing"

    expected_messages =
      original_messages
      |> Enum.with_index(2)
      |> Enum.map(fn {message, id} -> %{message | id: id} end)

    assert copied_messages == expected_messages
    assert Chat.get_users(target_chat) == []

    Chat.add_message(target_chat, %{type: :text, text: "new message", user_id: alice.id})
    assert List.last(Chat.get_messages(target_chat)).id == 4

    Chat.react(target_chat, 2, bob, "heart")
    Chat.delete_message(target_chat, 3, bob.id)
    assert [_, %Message{reactions: %{}}, %Message{id: 4}] = Chat.get_messages(target_chat)
    assert Chat.get_messages(@chat_type) == original_messages
  end

  describe "reactions" do
    setup %{user1: user} do
      {:ok, _pid} = Chat.start_link(@chat_type)
      Chat.add_message(@chat_type, %{type: :text, text: "hello", user_id: user.id, name: user.name})
      :ok
    end

    test "each user can add, replace and remove one reaction", %{user1: alice, user2: bob} do
      Codebattle.PubSub.subscribe("chat:game:#{elem(@chat_type, 1)}")

      assert :ok = Chat.react(@chat_type, 1, alice, "laugh")
      assert :ok = Chat.react(@chat_type, 1, bob, "laugh")
      assert [%Message{reactions: reactions}] = Chat.get_messages(@chat_type)
      assert reactions[alice.id] == %{reaction: "laugh", name: "alice"}
      assert reactions[bob.id] == %{reaction: "laugh", name: "bob"}

      assert :ok = Chat.react(@chat_type, 1, alice, "lang:elixir")
      assert [%Message{reactions: reactions}] = Chat.get_messages(@chat_type)
      assert map_size(reactions) == 2
      assert reactions[alice.id].reaction == "lang:elixir"
      assert reactions[bob.id].reaction == "laugh"

      assert :ok = Chat.react(@chat_type, 1, alice, "lang:elixir")
      assert [%Message{reactions: reactions}] = Chat.join_chat(@chat_type, alice).messages
      refute Map.has_key?(reactions, alice.id)
      assert reactions[bob.id].reaction == "laugh"

      assert_receive %{event: "chat:reactions_updated", payload: %Message{id: 1}}
    end

    test "concurrent users keep their reactions", %{user1: alice, user2: bob} do
      results =
        [alice, bob]
        |> Task.async_stream(&Chat.react(@chat_type, 1, &1, "heart"))
        |> Enum.to_list()

      assert results == [ok: :ok, ok: :ok]
      assert [%Message{reactions: reactions}] = Chat.get_messages(@chat_type)
      assert map_size(reactions) == 2
    end

    test "rejects invalid reactions and missing or deleted messages", %{user1: user} do
      for reaction <- [nil, %{}, "unknown", "lang:unknown"] do
        assert {:error, :invalid_reaction} = Chat.react(@chat_type, 1, user, reaction)
      end

      assert {:error, :not_found} = Chat.react(@chat_type, 999, user, "heart")
      assert [%Message{reactions: %{}}] = Chat.get_messages(@chat_type)

      Chat.delete_message(@chat_type, 1, user.id)
      assert {:error, :not_found} = Chat.react(@chat_type, 1, user, "heart")
    end

    test "rejects banned users, anonymous identities and system messages", %{user1: alice, user2: bob} do
      Chat.ban_user(@chat_type, %{admin_name: alice.name, user_id: bob.id, name: bob.name})
      assert {:error, :unauthorized} = Chat.react(@chat_type, 1, bob, "fire")
      assert {:error, :unauthorized} = Chat.react(@chat_type, 1, %{alice | id: nil}, "fire")
      assert {:error, :unauthorized} = Chat.react(@chat_type, 1, Codebattle.User.build_guest(), "fire")
      assert {:error, :unauthorized} = Chat.react(@chat_type, 2, alice, "fire")
    end

    test "only private-message participants can react", %{user1: alice, user2: bob, admin: outsider} do
      Chat.add_message(@chat_type, %{
        type: :text,
        text: "secret",
        user_id: alice.id,
        meta: %{"type" => "private", "target_user_id" => bob.id}
      })

      assert {:error, :unauthorized} = Chat.react(@chat_type, 2, outsider, "eyes")
      assert :ok = Chat.react(@chat_type, 2, alice, "heart")
      assert :ok = Chat.react(@chat_type, 2, bob, "heart")
    end
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
    assert {:error, :no_chat} = Chat.react(@chat_type, 1, user1, "heart")
  end
end
