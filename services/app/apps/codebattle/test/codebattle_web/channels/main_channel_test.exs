defmodule CodebattleWeb.MainChannelTest do
  use CodebattleWeb.ChannelCase

  alias CodebattleWeb.MainChannel
  alias CodebattleWeb.UserSocket
  alias CodebattleWeb.Presence
  alias Codebattle.Game

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

  test "on connect pushes presence state", %{creator_socket: creator_socket} do
    {:ok, response, socket} =
      subscribe_and_join(creator_socket, MainChannel, "main", %{state: "lobby"})

    assert response == %{active_game_id: nil}

    list = Presence.list(socket)

    assert_receive %Phoenix.Socket.Message{
      topic: "main",
      event: "presence_state",
      payload: payload
    }

    assert list == payload
  end

  test "sends active_game_id on join", %{creator_socket: creator_socket} do
    user = insert(:user)

    {:ok, response, _socket} =
      subscribe_and_join(creator_socket, MainChannel, "main", %{
        state: "lobby",
        follow_id: user.id
      })

    assert response == %{active_game_id: nil}

    game = insert(:game, player_ids: [user.id], state: "playing")

    {:ok, response, _socket} =
      subscribe_and_join(creator_socket, MainChannel, "main", %{
        state: "lobby",
        follow_id: user.id
      })

    assert response == %{active_game_id: game.id}
  end

  test "follow unfollow", %{creator_socket: creator_socket} do
    user = insert(:user)
    game = insert(:game, player_ids: [user.id], state: "playing")
    game_id = game.id

    {:ok, response, socket} =
      subscribe_and_join(creator_socket, MainChannel, "main", %{
        state: "lobby"
      })

    assert response == %{active_game_id: nil}

    push(socket, "user:follow", %{user_id: user.id + 1})

    assert_receive %Phoenix.Socket.Reply{
      topic: "main",
      payload: %{active_game_id: nil}
    }

    push(socket, "user:follow", %{user_id: user.id})

    assert_receive %Phoenix.Socket.Reply{
      topic: "main",
      payload: %{active_game_id: ^game_id}
    }

    Game.Context.create_game(%{players: [user]})
    :timer.sleep(100)

    assert_receive %Phoenix.Socket.Message{
      topic: "main",
      event: "user:game_created",
      payload: %{active_game_id: _}
    }

    push(socket, "user:unfollow", %{user_id: user.id})

    Game.Context.create_game(%{players: [user]})
    :timer.sleep(100)

    refute_receive %Phoenix.Socket.Message{
      topic: "main",
      event: "user:game_created",
      payload: %{active_game_id: _}
    }
  end
end
