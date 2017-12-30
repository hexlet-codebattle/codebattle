defmodule Codebattle.CodeCheck.Ruby.IntegrationTest do
  use Codebattle.IntegrationCase, async: true

  alias CodebattleWeb.GameChannel
  alias Codebattle.GameProcess.Server

  setup do
    user1 = insert(:user)
    user2 = insert(:user)

    task = insert(:task)

    socket1 = socket("user_id", %{user_id: user1.id, current_user: user1})
    socket2 = socket("user_id", %{user_id: user2.id, current_user: user2})

    {:ok, %{user1: user1, user2: user2, task: task, socket1: socket1, socket2: socket2}}
  end

  test "bad code, game playing", %{user1: user1, user2: user2, task: task, socket1: socket1, socket2: socket2} do
    #setup
    state = :playing
    data = %{first_player: user1, second_player: user2, task: task}
    game = setup_game(state, data)
    game_topic = "game:" <> to_string(game.id)

    {:ok, _response, socket1} = subscribe_and_join(socket1, GameChannel, game_topic)
    {:ok, _response, _socket2} = subscribe_and_join(socket2, GameChannel, game_topic)
    :lib.flush_receive()

    push socket1, "editor:text", %{editor_text: "dsf"}
    push socket1, "check_result", %{editor_text: "sdf", lang: "ruby"}
    :timer.sleep(2_000)

    fsm = Server.fsm(game.id)

    assert fsm.state == :playing
  end

  test "good code, player won", %{user1: user1, user2: user2, task: task, socket1: socket1, socket2: socket2} do
    #setup
    state = :playing
    data = %{first_player: user1, second_player: user2, task: task}
    game = setup_game(state, data)
    game_topic = "game:" <> to_string(game.id)

    {:ok, _response, socket1} = subscribe_and_join(socket1, GameChannel, game_topic)
    {:ok, _response, _socket2} = subscribe_and_join(socket2, GameChannel, game_topic)
    :lib.flush_receive()

    push socket1, "editor:text", %{editor_text: "test"}
    push socket1, "check_result", %{
      editor_text: "def solution(x,y); x + y; end",
      lang: "ruby"
    }

    :timer.sleep 2_000

    fsm = Server.fsm(game.id)

    assert fsm.state == :player_won
  end
end
