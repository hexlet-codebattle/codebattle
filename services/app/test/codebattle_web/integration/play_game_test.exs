defmodule Codebattle.PlayGameTest do
  use Codebattle.IntegrationCase

  alias Codebattle.GameProcess.Server
  alias CodebattleWeb.UserSocket

  setup %{conn: conn} do
    insert(:task)
    user1 = insert(:user, %{name: "first", email: "test1@test.test", github_id: 1, rating: 1000})
    user2 = insert(:user, %{name: "second", email: "test2@test.test", github_id: 2, rating: 1000})
    user3 = insert(:user, %{name: "other", email: "test3@test.test", github_id: 3, rating: 1000})

    conn1 = put_session(conn, :user_id, user1.id)
    conn2 = put_session(conn, :user_id, user2.id)
    conn3 = put_session(conn, :user_id, user3.id)

    socket1 = socket(UserSocket, "user_id", %{user_id: user1.id, current_user: user1})
    socket2 = socket(UserSocket, "user_id", %{user_id: user2.id, current_user: user2})
    socket3 = socket(UserSocket, "user_id", %{user_id: user3.id, current_user: user3})

    {:ok,
     %{
       conn1: conn1,
       conn2: conn2,
       conn3: conn3,
       socket1: socket1,
       socket2: socket2,
       socket3: socket3,
       user1: user1,
       user2: user2,
       user3: user3
     }}
  end

  test "Two users play game", %{
    conn1: conn1,
    conn2: conn2,
    socket1: socket1,
    socket2: socket2,
    user1: user1,
    user2: user2
  } do
    # Create game
    conn =
      conn1
      |> get(Routes.page_path(conn1, :index))
      |> post(game_path(conn1, :create, level: "easy", type: "withRandomPlayer"))

    game_id = game_id_from_conn(conn)

    game_topic = "game:" <> to_string(game_id)
    {:ok, _response, socket1} = subscribe_and_join(socket1, GameChannel, game_topic)

    {:ok, fsm} = Server.get_fsm(game_id)

    assert fsm.state == :waiting_opponent
    assert FsmHelpers.get_first_player(fsm).name == "first"
    assert FsmHelpers.get_second_player(fsm) == nil

    # First player cannot join to game as second player
    post(conn1, game_path(conn1, :join, game_id))
    {:ok, fsm} = Server.get_fsm(game_id)

    assert fsm.state == :waiting_opponent
    assert FsmHelpers.get_first_player(fsm).name == "first"
    assert FsmHelpers.get_second_player(fsm) == nil

    # Second player join game
    post(conn2, game_path(conn2, :join, game_id))
    {:ok, _response, socket2} = subscribe_and_join(socket2, GameChannel, game_topic)
    {:ok, fsm} = Server.get_fsm(game_id)

    assert fsm.state == :playing
    assert FsmHelpers.get_first_player(fsm).name == "first"
    assert FsmHelpers.get_second_player(fsm).name == "second"

    assert FsmHelpers.get_first_player(fsm).editor_text ==
             "const _ = require(\"lodash\");\nconst R = require(\"rambda\");\n\nconst solution = (a, b) => {\n\treturn 0;\n};\n\nmodule.exports = solution;"

    assert FsmHelpers.get_second_player(fsm).editor_text ==
             "const _ = require(\"lodash\");\nconst R = require(\"rambda\");\n\nconst solution = (a, b) => {\n\treturn 0;\n};\n\nmodule.exports = solution;"

    # First player won
    editor_text1 = "Hello world1!"
    editor_text2 = "Hello world2!"
    editor_text3 = "Hello world3!"

    Phoenix.ChannelTest.push(socket1, "check_result", %{
      editor_text: editor_text1,
      lang_slug: "js"
    })

    :timer.sleep(100)
    {:ok, fsm} = Server.get_fsm(game_id)
    assert fsm.state == :game_over
    assert FsmHelpers.get_first_player(fsm).name == "first"
    assert FsmHelpers.get_second_player(fsm).name == "second"
    assert FsmHelpers.get_winner(fsm).name == "first"
    assert FsmHelpers.get_first_player(fsm).editor_text == "Hello world1!"

    assert FsmHelpers.get_second_player(fsm).editor_text ==
             "const _ = require(\"lodash\");\nconst R = require(\"rambda\");\n\nconst solution = (a, b) => {\n\treturn 0;\n};\n\nmodule.exports = solution;"

    # Winner cannot check results again
    Phoenix.ChannelTest.push(socket1, "check_result", %{
      editor_text: editor_text2,
      lang_slug: "js"
    })

    :timer.sleep(100)
    {:ok, fsm} = Server.get_fsm(game_id)

    assert fsm.state == :game_over
    assert FsmHelpers.get_first_player(fsm).name == "first"
    assert FsmHelpers.get_second_player(fsm).name == "second"
    assert FsmHelpers.get_winner(fsm).name == "first"
    assert FsmHelpers.get_first_player(fsm).editor_text == "Hello world2!"

    assert FsmHelpers.get_second_player(fsm).editor_text ==
             "const _ = require(\"lodash\");\nconst R = require(\"rambda\");\n\nconst solution = (a, b) => {\n\treturn 0;\n};\n\nmodule.exports = solution;"

    # Second player complete game
    Phoenix.ChannelTest.push(socket2, "check_result", %{
      editor_text: editor_text3,
      lang_slug: "js"
    })

    game = Repo.get(Game, game_id)
    user1 = Repo.get(User, user1.id)
    user2 = Repo.get(User, user2.id)
    user_game1 = Repo.get_by(UserGame, user_id: user1.id)
    user_game2 = Repo.get_by(UserGame, user_id: user2.id)

    assert game.state == "game_over"
    assert user1.rating == 1012
    assert user2.rating == 988

    assert user_game1.creator == true
    assert user_game1.result == "won"
    assert user_game2.creator == false
    assert user_game2.result == "lost"
  end

  test "other players cannot change game state", %{
    conn1: conn1,
    conn2: conn2,
    conn3: conn3,
    socket3: socket3
  } do
    # Create game
    conn1 =
      conn1
      |> get(Routes.page_path(conn1, :index))
      |> post(game_path(conn1, :create, level: "easy", type: "withRandomPlayer"))

    game_id = game_id_from_conn(conn1)

    game_topic = "game:" <> to_string(game_id)

    post(conn2, game_path(conn2, :join, game_id))

    # Other player cannot join game
    post(conn3, game_path(conn3, :join, game_id))
    {:ok, fsm} = Server.get_fsm(game_id)

    assert fsm.state == :playing
    assert FsmHelpers.get_first_player(fsm).name == "first"
    assert FsmHelpers.get_second_player(fsm).name == "second"

    # Other player cannot win game
    {:ok, _response, socket3} = subscribe_and_join(socket3, GameChannel, game_topic)

    Phoenix.ChannelTest.push(socket3, "check_result", %{
      editor_text: "Hello world!",
      lang_slug: "js"
    })

    {:ok, fsm} = Server.get_fsm(game_id)

    assert fsm.state == :playing
    assert FsmHelpers.get_first_player(fsm).name == "first"
    assert FsmHelpers.get_second_player(fsm).name == "second"
  end
end
