defmodule Codebattle.CodeCheck.Haskell.IntegrationTest do
  use Codebattle.IntegrationCase

  alias CodebattleWeb.GameChannel
  alias Codebattle.GameProcess.{Server, Player}
  alias CodebattleWeb.UserSocket

  setup do
    timeout = Application.fetch_env!(:codebattle, :code_check_timeout)

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
       socket2: socket2,
       timeout: timeout
     }}
  end

  test "failure code, game playing", %{
    user1: user1,
    user2: user2,
    task: task,
    socket1: socket1,
    socket2: socket2,
    timeout: timeout
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
      editor_text:
        "module Check.Solution where\n\nsolution :: Int -> Int -> Int\nsolution x y = x - y",
      lang: "haskell"
    })

    :timer.sleep(timeout)

    assert_receive %Phoenix.Socket.Broadcast{
      payload: %{result: result, output: output}
    }

    expected_result = %{"status" => "failure", "result" => [1, 1]}
    assert expected_result == Poison.decode!(result)

    fsm = Server.fsm(game.id)

    assert fsm.state == :playing
  end

  test "error code, game playing", %{
    user1: user1,
    user2: user2,
    task: task,
    socket1: socket1,
    socket2: socket2,
    timeout: timeout
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

    Phoenix.ChannelTest.push(socket1, "check_result", %{editor_text: "sdf", lang: "haskell"})

    :timer.sleep(timeout)

    assert_receive %Phoenix.Socket.Broadcast{
      payload: %{result: result, output: output}
    }

    expected_result = %{
      "status" => "error",
      "result" =>
        "Check/Solution.hs:1:1: error:    File name does not match module name:    Saw: Main    Expected: Check.Solution  |1 | sdf  | ^"
    }

    assert expected_result == Poison.decode!(result)

    fsm = Server.fsm(game.id)

    assert fsm.state == :playing
  end

  test "good code, player won", %{
    user1: user1,
    user2: user2,
    task: task,
    socket1: socket1,
    socket2: socket2,
    timeout: timeout
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
      editor_text:
        "module Check.Solution where\n\nsolution :: Int -> Int -> Int\nsolution x y = x + y",
      lang: "haskell"
    })

    :timer.sleep(timeout)

    fsm = Server.fsm(game.id)
    assert fsm.state == :game_over
  end
end
