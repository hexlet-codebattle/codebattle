defmodule CodebattleWeb.GameChannelTest do
  use CodebattleWeb.ChannelCase

  alias CodebattleWeb.GameChannel

  setup do
    user1 = insert(:user)
    user2 = insert(:user)

    user_token1 = Phoenix.Token.sign(socket(), "user_token", user1.id)
    {:ok, socket1} = connect(CodebattleWeb.UserSocket, %{"token" => user_token1})

    user_token2 = Phoenix.Token.sign(socket(), "user_token", user2.id)
    {:ok, socket2} = connect(CodebattleWeb.UserSocket, %{"token" => user_token2})

    {:ok, %{user1: user1, user2: user2, socket1: socket1, socket2: socket2}}
  end

  test "sends game info when user join", %{user1: user1, socket1: socket1} do
    #setup
    state = :waiting_opponent
    data = %{first_player: user1}
    game = setup_game(state, data)
    game_topic = "game:" <> to_string(game.id)

    {:ok, response, _socket1} = subscribe_and_join(socket1, GameChannel, game_topic)

    assert response == %{
      status: :waiting_opponent,
      winner: nil,
      first_player: %{
        id: user1.id,
        name: user1.name,
        raiting: user1.raiting,
      },
      second_player: %{
        id: nil,
        name: nil,
        raiting: nil,
      },
      first_player_editor_data: "",
      second_player_editor_data: "",
    }
  end

  test "broadcasts user:joined with state after user join", %{user1: user1, user2: user2, socket2: socket2} do
    #setup
    state = :playing
    data = %{first_player: user1, second_player: user2}
    game = setup_game(state, data)
    game_topic = "game:" <> to_string(game.id)
    {:ok, _response, _socket2} = subscribe_and_join(socket2, GameChannel, game_topic)

    payload = %{
      first_player: %{id: user1.id, name: user1.name, raiting: user1.raiting},
      second_player: %{id: user2.id, name: user2.name, raiting: user2.raiting},
      status: :playing,
      winner: nil,
    }

    assert_receive %Phoenix.Socket.Broadcast{
      topic: ^game_topic,
      event: "user:joined",
      payload: ^payload,
    }
  end

  test "broadcasts editor:update, after editor:data", %{user1: user1, user2: user2, socket1: socket1, socket2: socket2} do
    #setup
    state = :playing
    data = %{first_player: user1, second_player: user2}
    game = setup_game(state, data)
    game_topic = "game:" <> to_string(game.id)
    editor_text1 = "test1"
    editor_text2 = "test2"

    {:ok, _response, socket1} = subscribe_and_join(socket1, GameChannel, game_topic)
    {:ok, _response, socket2} = subscribe_and_join(socket2, GameChannel, game_topic)
    :lib.flush_receive()

    push socket1, "editor:data", %{data: editor_text1}
    push socket2, "editor:data", %{data: editor_text2}

    payload1 = %{user_id: user1.id, editor_text: editor_text1}
    payload2 = %{user_id: user2.id, editor_text: editor_text2}

    assert_receive %Phoenix.Socket.Broadcast{
      topic: ^game_topic,
      event: "editor:update",
      payload: ^payload1,
    }

    assert_receive %Phoenix.Socket.Broadcast{
      topic: ^game_topic,
      event: "editor:update",
      payload: ^payload2,
    }
  end
end
