defmodule CodebattleWeb.GameChannelTest do
  use CodebattleWeb.ChannelCase

  alias CodebattleWeb.GameChannel
  alias Codebattle.GameProcess.{Player, Server, FsmHelpers}
  alias CodebattleWeb.UserSocket

  setup do
    user1 = insert(:user, rating: 1000)
    user2 = insert(:user, rating: 1000)
    game = insert(:game)

    user_token1 = Phoenix.Token.sign(socket(UserSocket), "user_token", user1.id)
    {:ok, socket1} = connect(UserSocket, %{"token" => user_token1})

    user_token2 = Phoenix.Token.sign(socket(UserSocket), "user_token", user2.id)
    {:ok, socket2} = connect(UserSocket, %{"token" => user_token2})

    {:ok, %{user1: user1, user2: user2, socket1: socket1, socket2: socket2, game: game}}
  end

  test "sends game info when user join", %{user1: user1, socket1: socket1} do
    # setup
    state = :waiting_opponent
    data = %{players: [Player.build(user1), %Player{}]}
    game = setup_game(state, data)
    game_topic = "game:" <> to_string(game.id)

    {:ok, response, _socket1} = subscribe_and_join(socket1, GameChannel, game_topic)

    assert response.level == game.task.level
  end

  test "broadcasts editor:data, after editor:data", %{
    user1: user1,
    user2: user2,
    socket1: socket1,
    socket2: socket2
  } do
    # setup
    state = :playing
    data = %{players: [Player.build(user1), Player.build(user2)]}
    game = setup_game(state, data)
    game_topic = "game:" <> to_string(game.id)
    editor_text1 = "test1"
    editor_text2 = "test2"

    {:ok, _response, socket1} = subscribe_and_join(socket1, GameChannel, game_topic)
    {:ok, _response, socket2} = subscribe_and_join(socket2, GameChannel, game_topic)
    Mix.Shell.Process.flush()

    push(socket1, "editor:data", %{editor_text: editor_text1, lang_slug: "js"})
    push(socket2, "editor:data", %{editor_text: editor_text2, lang_slug: "js"})

    payload1 = %{user_id: user1.id, editor_text: editor_text1, lang_slug: "js"}
    payload2 = %{user_id: user2.id, editor_text: editor_text2, lang_slug: "js"}

    assert_receive %Phoenix.Socket.Broadcast{
      topic: ^game_topic,
      event: "editor:data",
      payload: ^payload1
    }

    assert_receive %Phoenix.Socket.Broadcast{
      topic: ^game_topic,
      event: "editor:data",
      payload: ^payload2
    }
  end

  test "chahge lang after change lang", %{
    user1: user1,
    user2: user2,
    socket1: socket1,
    socket2: socket2
  } do
    # setup
    state = :playing
    data = %{players: [Player.build(user1), Player.build(user2)]}
    game = setup_game(state, data)
    game_topic = "game:" <> to_string(game.id)
    editor_lang1 = "js"
    editor_lang2 = "ruby"

    {:ok, _response, socket1} = subscribe_and_join(socket1, GameChannel, game_topic)
    {:ok, _response, socket2} = subscribe_and_join(socket2, GameChannel, game_topic)
    Mix.Shell.Process.flush()

    push(socket1, "editor:data", %{lang_slug: editor_lang1, editor_text: 'text1'})
    push(socket2, "editor:data", %{lang_slug: editor_lang2, editor_text: 'text2'})

    payload1 = %{
      user_id: user1.id,
      lang_slug: editor_lang1,
      editor_text: 'text1'
    }

    payload2 = %{
      user_id: user2.id,
      lang_slug: editor_lang2,
      editor_text: 'text2'
    }

    assert_receive %Phoenix.Socket.Broadcast{
      topic: ^game_topic,
      event: "editor:data",
      payload: ^payload1
    }

    assert_receive %Phoenix.Socket.Broadcast{
      topic: ^game_topic,
      event: "editor:data",
      payload: ^payload2
    }
  end

  test "on give up opponents win when state playing", %{
    user1: user1,
    user2: user2,
    socket1: socket1,
    socket2: socket2,
    game: game
  } do
    # setup
    state = :playing

    data = %{
      task: game.task,
      players: [Player.build(user1), Player.build(user2)]
    }

    game = setup_game(state, data)
    game_topic = "game:" <> to_string(game.id)

    {:ok, _response, socket1} = subscribe_and_join(socket1, GameChannel, game_topic)
    {:ok, _response, _socket2} = subscribe_and_join(socket2, GameChannel, game_topic)
    Mix.Shell.Process.flush()

    push(socket1, "give_up")

    message = "#{user1.name} gave up!"
    :timer.sleep(100)
    {:ok, fsm} = Server.get_fsm(game.id)
    players = FsmHelpers.get_players(fsm)

    payload = %{
      players: players,
      status: :game_over,
      need_advice: false,
      msg: message
    }

    assert_receive %Phoenix.Socket.Broadcast{
      topic: ^game_topic,
      event: "user:give_up",
      payload: ^payload
    }

    {:ok, fsm} = Server.get_fsm(game.id)

    assert fsm.state == :game_over
    assert FsmHelpers.gave_up?(fsm, user1.id) == true
    assert FsmHelpers.winner?(fsm, user2.id) == true
    :timer.sleep(100)

    game = Repo.get(Game, game.id)
    user1 = Repo.get(User, user1.id)
    user2 = Repo.get(User, user2.id)
    assert game.state == "game_over"
    assert user1.rating == 988
    assert user2.rating == 1012
  end
end
