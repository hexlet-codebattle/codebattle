defmodule CodebattleWeb.GameChannelTest do
  use CodebattleWeb.ChannelCase

  alias CodebattleWeb.GameChannel
  alias Codebattle.GameProcess.{Player, Server, FsmHelpers}

  setup do
    user1 = insert(:user, rating: 1000)
    user2 = insert(:user, rating: 1000)
    task = insert(:task)

    user_token1 = Phoenix.Token.sign(socket(), "user_token", user1.id)
    {:ok, socket1} = connect(CodebattleWeb.UserSocket, %{"token" => user_token1})

    user_token2 = Phoenix.Token.sign(socket(), "user_token", user2.id)
    {:ok, socket2} = connect(CodebattleWeb.UserSocket, %{"token" => user_token2})

    {:ok, %{user1: user1, user2: user2, socket1: socket1, socket2: socket2, task: task}}
  end

  test "sends game info when user join", %{user1: user1, socket1: socket1, task: task} do
    # setup
    state = :waiting_opponent
    data = %{players: [%Player{id: user1.id, user: user1}, %Player{}], task: task}
    game = setup_game(state, data)
    game_topic = "game:" <> to_string(game.id)

    {:ok, response, _socket1} = subscribe_and_join(socket1, GameChannel, game_topic)

    assert Poison.encode(response) ==
             Poison.encode(%{
               status: :waiting_opponent,
               winner: %Codebattle.User{},
               first_player: user1,
               second_player: %Codebattle.User{},
               first_player_editor_text: "",
               second_player_editor_text: "",
               first_player_editor_lang: "js",
               second_player_editor_lang: "js",
               task: task
             })
  end

  test "broadcasts user:joined with state after user join", %{
    user1: user1,
    user2: user2,
    socket2: socket2
  } do
    # setup
    state = :playing
    data = %{players: [%Player{id: user1.id, user: user1}, %Player{id: user2.id, user: user2}]}
    game = setup_game(state, data)
    game_topic = "game:" <> to_string(game.id)
    {:ok, _response, _socket2} = subscribe_and_join(socket2, GameChannel, game_topic)

    assert_receive %Phoenix.Socket.Broadcast{
      topic: ^game_topic,
      event: "user:joined",
      payload: response
    }

    assert Poison.encode(response) ==
             Poison.encode(%{
               first_player: user1,
               second_player: user2,
               status: :playing,
               first_player_editor_text: "",
               second_player_editor_text: "",
               first_player_editor_lang: "js",
               second_player_editor_lang: "js",
               winner: %Codebattle.User{}
             })
  end

  test "broadcasts editor:text, after editor:text", %{
    user1: user1,
    user2: user2,
    socket1: socket1,
    socket2: socket2
  } do
    # setup
    state = :playing
    data = %{players: [%Player{id: user1.id, user: user1}, %Player{id: user2.id, user: user2}]}
    game = setup_game(state, data)
    game_topic = "game:" <> to_string(game.id)
    editor_text1 = "test1"
    editor_text2 = "test2"

    {:ok, _response, socket1} = subscribe_and_join(socket1, GameChannel, game_topic)
    {:ok, _response, socket2} = subscribe_and_join(socket2, GameChannel, game_topic)
    Mix.Shell.Process.flush()

    push(socket1, "editor:text", %{editor_text: editor_text1})
    push(socket2, "editor:text", %{editor_text: editor_text2})

    payload1 = %{user_id: user1.id, editor_text: editor_text1}
    payload2 = %{user_id: user2.id, editor_text: editor_text2}

    assert_receive %Phoenix.Socket.Broadcast{
      topic: ^game_topic,
      event: "editor:text",
      payload: ^payload1
    }

    assert_receive %Phoenix.Socket.Broadcast{
      topic: ^game_topic,
      event: "editor:text",
      payload: ^payload2
    }
  end

  test "broadcasts editor:lang, after editor:lang", %{
    user1: user1,
    user2: user2,
    socket1: socket1,
    socket2: socket2
  } do
    # setup
    state = :playing
    data = %{players: [%Player{id: user1.id, user: user1}, %Player{id: user2.id, user: user2}]}
    game = setup_game(state, data)
    game_topic = "game:" <> to_string(game.id)
    editor_lang1 = "js"
    editor_lang2 = "ruby"

    {:ok, _response, socket1} = subscribe_and_join(socket1, GameChannel, game_topic)
    {:ok, _response, socket2} = subscribe_and_join(socket2, GameChannel, game_topic)
    Mix.Shell.Process.flush()

    push(socket1, "editor:lang", %{lang: editor_lang1})
    push(socket2, "editor:lang", %{lang: editor_lang2})

    payload1 = %{user_id: user1.id, lang: editor_lang1}
    payload2 = %{user_id: user2.id, lang: editor_lang2}

    assert_receive %Phoenix.Socket.Broadcast{
      topic: ^game_topic,
      event: "editor:lang",
      payload: ^payload1
    }

    assert_receive %Phoenix.Socket.Broadcast{
      topic: ^game_topic,
      event: "editor:lang",
      payload: ^payload2
    }
  end

  test "on give up opponents win when state playing", %{
    user1: user1,
    user2: user2,
    socket1: socket1,
    socket2: socket2
  } do
    # setup
    state = :playing

    data = %{
      task: build(:task),
      players: [%Player{id: user1.id, user: user1}, %Player{id: user2.id, user: user2}]
    }

    game = setup_game(state, data)
    game_topic = "game:" <> to_string(game.id)

    {:ok, _response, socket1} = subscribe_and_join(socket1, GameChannel, game_topic)
    {:ok, _response, _socket2} = subscribe_and_join(socket2, GameChannel, game_topic)
    Mix.Shell.Process.flush()

    push(socket1, "give_up")

    winner = user2
    message = "#{user1.name} gave up!"

    payload = %{
      winner: winner,
      status: "game_over",
      msg: message
    }

    assert_receive %Phoenix.Socket.Broadcast{
      topic: ^game_topic,
      event: "give_up",
      payload: ^payload
    }

    fsm = Server.fsm(game.id)

    assert fsm.state == :game_over
    assert FsmHelpers.gave_up?(fsm.data, user1.id) == true
    assert FsmHelpers.winner?(fsm.data, user2.id) == true
    :timer.sleep(100)

    game = Repo.get(Game, game.id)
    user1 = Repo.get(User, user1.id)
    user2 = Repo.get(User, user2.id)

    assert game.state == "game_over"
    assert user1.rating == 988
    assert user2.rating == 1012
  end
end
