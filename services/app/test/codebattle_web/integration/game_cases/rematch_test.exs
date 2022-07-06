defmodule Codebattle.GameCases.RematchTest do
  use Codebattle.IntegrationCase, async: false

  alias Codebattle.Bot
  alias Codebattle.Game
  alias CodebattleWeb.UserSocket

  setup %{conn: conn} do
    insert(:task, level: "elementary")
    user1 = insert(:user)
    user2 = insert(:user)

    conn1 = put_session(conn, :user_id, user1.id)
    conn2 = put_session(conn, :user_id, user2.id)

    socket1 = socket(UserSocket, "user_id", %{user_id: user1.id, current_user: user1})
    socket2 = socket(UserSocket, "user_id", %{user_id: user2.id, current_user: user2})

    {:ok,
     %{conn1: conn1, conn2: conn2, socket1: socket1, socket2: socket2, user1: user1, user2: user2}}
  end

  test "first user gave up and send rematch offer, second user accept rematch", %{
    conn2: conn2,
    socket1: socket1,
    socket2: socket2,
    user1: user1,
    user2: user2
  } do
    # Create game

    {:ok, _response, socket1} = subscribe_and_join(socket1, LobbyChannel, "lobby")

    ref = Phoenix.ChannelTest.push(socket1, "game:create", %{level: "easy"})
    Phoenix.ChannelTest.assert_reply(ref, :ok, %{game_id: game_id})

    game_topic = "game:" <> to_string(game_id)
    {:ok, _response, socket1} = subscribe_and_join(socket1, GameChannel, game_topic)

    # Second player join game
    post(conn2, game_path(conn2, :join, game_id))
    {:ok, _response, socket2} = subscribe_and_join(socket2, GameChannel, game_topic)

    editor_text_init =
      "const _ = require(\"lodash\");\nconst R = require(\"rambda\");\n\nconst solution = (a, b) => {\n\treturn 0;\n};\n\nmodule.exports = solution;"

    game = Game.Context.get_game(game_id)
    assert game.state == "playing"
    assert Helpers.get_first_player(game).editor_text == editor_text_init
    assert Helpers.get_second_player(game).editor_text == editor_text_init

    editor_text1 = "Hello world1!"
    editor_text2 = "Hello world2!"

    # Both players enter some text in text editor
    Phoenix.ChannelTest.push(socket1, "editor:data", %{editor_text: editor_text1, lang_slug: "js"})

    Phoenix.ChannelTest.push(socket2, "editor:data", %{editor_text: editor_text2, lang_slug: "js"})

    :timer.sleep(70)
    game = Game.Context.get_game(game.id)

    assert Helpers.get_first_player(game).editor_text == editor_text1
    assert Helpers.get_second_player(game).editor_text == editor_text2

    # First player give_up
    Phoenix.ChannelTest.push(socket1, "give_up", %{})
    :timer.sleep(70)
    game = Game.Context.get_game(game.id)
    assert game.state == "game_over"

    # First player send rematch offer
    Phoenix.ChannelTest.push(socket1, "rematch:send_offer", %{})
    :timer.sleep(70)
    game = Game.Context.get_game(game.id)
    assert game.state == "game_over"
    assert Helpers.get_rematch_state(game) == "in_approval"

    # Second player accept rematch offer
    Phoenix.ChannelTest.push(socket2, "rematch:accept_offer", %{})
    :timer.sleep(70)
    game = Game.Context.get_game(game_id + 1)

    assert game.state == "playing"
    assert Helpers.get_level(game) == "easy"
    assert Helpers.get_first_player(game).id == user1.id
    assert Helpers.get_second_player(game).id == user2.id

    # Text editor go to init state, after start new game after rematch
    assert Helpers.get_first_player(game).editor_text == editor_text_init
    assert Helpers.get_second_player(game).editor_text == editor_text_init
  end

  test "first user gave up and send rematch offer to the bot", %{
    conn1: conn1,
    socket1: socket1
  } do
    task = insert(:task, level: "elementary")
    bot = Bot.Factory.build()

    insert(:playbook, %{task: task})

    # Create game
    {:ok, game} =
      Game.Context.create_game(%{
        task: task,
        state: "waiting_opponent",
        players: [bot]
      })

    game_id = Helpers.get_game_id(game)
    game_topic = "game:" <> to_string(game_id)

    # User join to the game
    post(conn1, game_path(conn1, :join, game_id))

    game = Game.Context.get_game(game.id)
    assert game.state == "playing"

    {:ok, _response, socket1} = subscribe_and_join(socket1, GameChannel, game_topic)
    :timer.sleep(70)

    # User give_up
    Phoenix.ChannelTest.push(socket1, "give_up", %{})
    :timer.sleep(70)
    game = Game.Context.get_game(game.id)
    assert game.state == "game_over"

    Phoenix.ChannelTest.push(socket1, "rematch:send_offer", %{})
    :timer.sleep(150)
    game = Game.Context.get_game(game_id + 1)
    assert game.state == "playing"
  end

  test "first user gave up and both users send rematch offer at same time", %{
    conn2: conn2,
    socket1: socket1,
    socket2: socket2,
    user1: user1,
    user2: user2
  } do
    # Create game

    {:ok, _response, socket1} = subscribe_and_join(socket1, LobbyChannel, "lobby")

    ref = Phoenix.ChannelTest.push(socket1, "game:create", %{level: "easy"})
    Phoenix.ChannelTest.assert_reply(ref, :ok, %{game_id: game_id})

    game_topic = "game:" <> to_string(game_id)
    {:ok, _response, socket1} = subscribe_and_join(socket1, GameChannel, game_topic)

    # Second player join game
    post(conn2, game_path(conn2, :join, game_id))
    {:ok, _response, socket2} = subscribe_and_join(socket2, GameChannel, game_topic)

    # First player give_up
    Phoenix.ChannelTest.push(socket1, "give_up", %{})
    :timer.sleep(70)
    game = Game.Context.get_game(game_id)
    assert game.state == "game_over"

    Phoenix.ChannelTest.push(socket1, "rematch:send_offer", %{})
    :timer.sleep(70)
    game = Game.Context.get_game(game.id)
    assert game.state == "game_over"
    assert Helpers.get_rematch_state(game) == "in_approval"

    Phoenix.ChannelTest.push(socket2, "rematch:send_offer", %{})
    :timer.sleep(70)

    game = Game.Context.get_game(game_id + 1)
    assert game.state == "playing"
    assert Helpers.get_level(game) == "easy"
    assert Helpers.get_first_player(game).id == user1.id
    assert Helpers.get_second_player(game).id == user2.id
  end

  test "reject offer", %{conn2: conn2, socket1: socket1, socket2: socket2} do
    # Create game
    {:ok, _response, socket1} = subscribe_and_join(socket1, LobbyChannel, "lobby")

    ref = Phoenix.ChannelTest.push(socket1, "game:create", %{level: "easy"})
    Phoenix.ChannelTest.assert_reply(ref, :ok, %{game_id: game_id})

    game_topic = "game:" <> to_string(game_id)
    {:ok, _response, socket1} = subscribe_and_join(socket1, GameChannel, game_topic)

    # Second player join game
    post(conn2, game_path(conn2, :join, game_id))
    {:ok, _response, socket2} = subscribe_and_join(socket2, GameChannel, game_topic)

    # First player give_up
    Phoenix.ChannelTest.push(socket1, "give_up", %{})
    :timer.sleep(70)
    game = Game.Context.get_game(game_id)
    assert game.state == "game_over"

    Phoenix.ChannelTest.push(socket1, "rematch:send_offer", %{})
    :timer.sleep(70)
    game = Game.Context.get_game(game.id)
    assert game.state == "game_over"
    assert Helpers.get_rematch_state(game) == "in_approval"

    Phoenix.ChannelTest.push(socket2, "rematch:reject_offer", %{})
    :timer.sleep(70)
    game = Game.Context.get_game(game.id)
    assert Helpers.get_rematch_state(game) == "rejected"

    assert_raise Ecto.NoResultsError, fn ->
      Game.Context.get_game(game_id + 1)
    end
  end

  test "first player leave game", %{conn2: conn2, socket1: socket1, socket2: socket2} do
    {:ok, _response, socket1} = subscribe_and_join(socket1, LobbyChannel, "lobby")

    ref = Phoenix.ChannelTest.push(socket1, "game:create", %{level: "easy"})
    Phoenix.ChannelTest.assert_reply(ref, :ok, %{game_id: game_id})

    game_topic = "game:" <> to_string(game_id)
    {:ok, _response, socket1} = subscribe_and_join(socket1, GameChannel, game_topic)

    post(conn2, game_path(conn2, :join, game_id))
    {:ok, _response, socket2} = subscribe_and_join(socket2, GameChannel, game_topic)

    Phoenix.ChannelTest.push(socket1, "give_up", %{})
    :timer.sleep(70)
    game = Game.Context.get_game(game_id)
    assert game.state == "game_over"

    Phoenix.ChannelTest.push(socket2, "rematch:reject_offer", %{})
    :timer.sleep(70)
    game = Game.Context.get_game(game.id)
    assert Helpers.get_rematch_state(game) == "rejected"

    {:error, :not_found} = Game.Context.get_game(game_id + 1)
  end
end
