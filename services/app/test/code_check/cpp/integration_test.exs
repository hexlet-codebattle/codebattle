defmodule Codebattle.CodeCheck.Cpp.IntegrationTest do
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

    Phoenix.ChannelTest.push(socket1, "check_result", %{editor_text: "sdf\n", lang: "cpp"})

    assert_code_check()

    assert_receive %Phoenix.Socket.Broadcast{
      payload: %{result: result, output: output}
    }

    expected_result = %{
      "status" => "error",
      "result" => "./check/solution.cpp:1:1: error: 'sdf' does not name a type"
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
      editor_text: "int solution(int a, int b) { return a - b;}",
      lang: "cpp"
    })

    assert_code_check()

    assert_receive %Phoenix.Socket.Broadcast{
      payload: %{result: result, output: output}
    }

    expected_result = %{"status" => "failure", "result" => 0, "arguments" => "[1, 1]"}
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
      editor_text: "int solution(int a, int b) { return a + b;}",
      lang: "cpp"
    })

    assert_code_check()
    {:ok, fsm} = Server.fsm(game.id)

    assert fsm.state == :game_over
  end

  @tag :code_check
  test "good code, player won with vectors", %{
    user1: user1,
    user2: user2,
    socket1: socket1,
    socket2: socket2
  } do
    # setup
    state = :playing
    task = insert(:task_vectors)

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
        "#include <iostream> \n #include <vector> \n using namespace std; \n
      vector<string> solution(vector<string> a, vector<string> b) { return vector<string> {\"abcdef\"};}",
      lang: "cpp"
    })

    assert_code_check()
    {:ok, fsm} = Server.fsm(game.id)

    assert fsm.state == :game_over
  end
end
