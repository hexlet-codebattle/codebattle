defmodule Codebattle.CodeCheck.Php.IntegrationTest do
  use Codebattle.IntegrationCase

  alias CodebattleWeb.GameChannel
  alias Codebattle.GameProcess.{Server, Player}
  alias CodebattleWeb.UserSocket

  setup do
    user1 = insert(:user)
    user2 = insert(:user)

    task = insert(:task)

    socket1 = socket(UserSocket, "user_id", %{user_id: user1.id, current_user: user1})
    socket2 = socket(UserSocket, "user_id", %{user_id: user2.id, current_user: user2})

    {:ok,
     %{
       user1: user1,
       user2: user2,
       task: task,
       socket1: socket1,
       socket2: socket2
     }}
  end

  @tag :code_check
  test "error code, game playing", %{
    user1: user1,
    user2: user2,
    task: task,
    socket1: socket1,
    socket2: socket2
  } do
    # setup
    state = :playing

    data = %{
      players: [%Player{id: user1.id}, %Player{id: user2.id}],
      task: task
    }

    game = setup_game(state, data)
    game_topic = "game:" <> to_string(game.id)

    {:ok, _response, socket1} = subscribe_and_join(socket1, GameChannel, game_topic)
    {:ok, _response, _socket2} = subscribe_and_join(socket2, GameChannel, game_topic)
    Mix.Shell.Process.flush()

    Phoenix.ChannelTest.push(socket1, "check_result", %{editor_text: "sdf();", lang: "php"})

    assert_code_check()

    assert_receive %Phoenix.Socket.Broadcast{
      payload: %{result: result, output: output}
    }

    expected_result = %{
      "status" => "error",
      "result" =>
        "Uncaught Error: Call to undefined function solution() in /usr/src/app/check/checker.php:53"
    }

    assert expected_result == Jason.decode!(result)

    {:ok, fsm} = Server.fsm(game.id)

    assert fsm.state == :playing
  end

  @tag :code_check
  test "failure code, game playing", %{
    user1: user1,
    user2: user2,
    task: task,
    socket1: socket1,
    socket2: socket2
  } do
    # setup
    state = :playing

    data = %{
      players: [%Player{id: user1.id}, %Player{id: user2.id}],
      task: task
    }

    game = setup_game(state, data)
    game_topic = "game:" <> to_string(game.id)

    {:ok, _response, socket1} = subscribe_and_join(socket1, GameChannel, game_topic)
    {:ok, _response, _socket2} = subscribe_and_join(socket2, GameChannel, game_topic)
    Mix.Shell.Process.flush()

    Phoenix.ChannelTest.push(socket1, "check_result", %{
      editor_text: "<?php\nfunction solution($a, $b) { return $a; }\n",
      lang: "php"
    })

    assert_code_check()

    assert_receive %Phoenix.Socket.Broadcast{
      payload: %{result: result, output: output}
    }

    expected_result = %{"status" => "failure", "result" => 1, "arguments" => [1, 1]}

    assert expected_result == Jason.decode!(result)

    {:ok, fsm} = Server.fsm(game.id)

    assert fsm.state == :playing
  end

  @tag :code_check
  test "good code, player won", %{
    user1: user1,
    user2: user2,
    task: task,
    socket1: socket1,
    socket2: socket2
  } do
    # setup
    state = :playing

    data = %{
      players: [%Player{id: user1.id}, %Player{id: user2.id}],
      task: task
    }

    game = setup_game(state, data)
    game_topic = "game:" <> to_string(game.id)

    {:ok, _response, socket1} = subscribe_and_join(socket1, GameChannel, game_topic)
    {:ok, _response, _socket2} = subscribe_and_join(socket2, GameChannel, game_topic)

    Mix.Shell.Process.flush()

    Phoenix.ChannelTest.push(socket1, "editor:data", %{editor_text: "test"})

    Phoenix.ChannelTest.push(socket1, "check_result", %{
      editor_text: "<?php\nfunction solution($x, $y){ return $x + $y; }\n",
      lang: "php"
    })

    assert_code_check()

    {:ok, fsm} = Server.fsm(game.id)
    assert fsm.state == :game_over
  end
end
