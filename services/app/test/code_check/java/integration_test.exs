defmodule Codebattle.CodeCheck.Java.IntegrationTest do
  use Codebattle.IntegrationCase

  alias CodebattleWeb.GameChannel
  alias Codebattle.Game.{Server, Player}
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

    Phoenix.ChannelTest.push(socket1, "check_result", %{editor_text: "sdf\n", lang_slug: "java"})

    assert_code_check()

    assert_receive %Phoenix.Socket.Broadcast{
      payload: %{check_result: check_result}
    }

    assert %Codebattle.CodeCheck.CheckResult{status: :error, success_count: 0} = check_result

    {:ok, fsm} = Server.get_fsm(game.id)
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
      editor_text:
        "package solution; \n
        public class Solution { public Integer solution(Integer a, Integer b) { return a - b; } }",
      lang_slug: "java"
    })

    assert_code_check()

    assert_receive %Phoenix.Socket.Broadcast{
      payload: %{check_result: check_result}
    }

    assert %Codebattle.CodeCheck.CheckResult{status: :failure, success_count: 0} = check_result

    {:ok, fsm} = Server.get_fsm(game.id)
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

    Phoenix.ChannelTest.push(socket1, "editor:data", %{editor_text: "test", lang_slug: "js"})

    Phoenix.ChannelTest.push(socket1, "check_result", %{
      editor_text:
        "package solution; public class Solution { public Integer solution(Integer a, Integer b) { return a + b; } }",
      lang_slug: "java"
    })

    assert_code_check()

    assert_receive %Phoenix.Socket.Broadcast{
      payload: %{status: :game_over}
    }

    {:ok, fsm} = Server.get_fsm(game.id)

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

    Phoenix.ChannelTest.push(socket1, "editor:data", %{editor_text: "test", lang_slug: "js"})

    Phoenix.ChannelTest.push(socket1, "check_result", %{
      editor_text:
        "package solution; import java.util.*; \n
      public class Solution { public List<String> solution(List<String> a, List<String> b) { return List.of(\"abcdef\"); } }",
      lang_slug: "java"
    })

    assert_code_check()

    assert_receive %Phoenix.Socket.Broadcast{
      payload: %{status: :game_over}
    }

    {:ok, fsm} = Server.get_fsm(game.id)

    assert fsm.state == :game_over
  end
end
