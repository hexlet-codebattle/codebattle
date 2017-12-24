defmodule Codebattle.Bot.PlaybookPlayTest do
  use Codebattle.IntegrationCase

  import Mock

  alias CodebattleWeb.GameChannel
  alias Codebattle.GameProcess.Server

  @timeout Application.get_env(:codebattle, Codebattle.Bot)[:timeout]

  setup do
    playbook_data = %{playbook: [
      %{"time" => 50, "diff" => inspect([%Diff.Modified{element: ["t"], index: 0, length: 1, old_element: [" "]}])},
      %{"time" => 50, "diff" => inspect([%Diff.Insert{element: ["e"], index: 1, length: 1}])},
      %{"time" => 50, "diff" => inspect([%Diff.Insert{element: ["s"], index: 2, length: 1}])},
      %{"time" => 50, "diff" => inspect([])},
    ]}

    user1 = insert(:user)
    task = insert(:task)
    bot = insert(:user, id: 0)

    playbook = insert(:bot_playbook, %{data: playbook_data, task_id: task.id})

    conn1 = assign(build_conn(), :user, user1)

    socket1 = socket("user_id", %{user_id: user1.id, current_user: user1})

    {:ok, %{user1: user1, socket1: socket1, conn1: conn1, task: task, playbook: playbook, bot: bot}}
  end

  test "waits timeout before joins game", %{socket1: socket1, conn1: conn1} do
    # Create game
    conn = post(conn1, game_path(conn1, :create))
    game_location = conn.resp_headers
                    |> Enum.find(&match?({"location", _}, &1))
                    |> elem(1)

    game_id = ~r/\d+/ |> Regex.run(game_location) |> List.first |> String.to_integer
    game_topic = "game:" <> to_string(game_id)
    {:ok, _response, _socket1} = subscribe_and_join(socket1, GameChannel, game_topic)

    :timer.sleep(@timeout - 10)
    fsm = Server.fsm(game_id)

    assert fsm.state == :waiting_opponent
  end

  test "joins game after timeout", %{socket1: socket1, conn1: conn1} do
    # Create game
    conn = post(conn1, game_path(conn1, :create))
    game_location = conn.resp_headers
                    |> Enum.find(&match?({"location", _}, &1))
                    |> elem(1)

    game_id = ~r/\d+/ |> Regex.run(game_location) |> List.first |> String.to_integer
    game_topic = "game:" <> to_string(game_id)
    {:ok, _response, _socket1} = subscribe_and_join(socket1, GameChannel, game_topic)

    :timer.sleep(@timeout + 50)
    fsm = Server.fsm(game_id)

    assert fsm.state == :playing
  end

  test "pushes editors text to game with timeouts", %{socket1: socket1, conn1: conn1} do
    # Create game
    conn = post(conn1, game_path(conn1, :create))
    game_location = conn.resp_headers
                    |> Enum.find(&match?({"location", _}, &1))
                    |> elem(1)

    game_id = ~r/\d+/ |> Regex.run(game_location) |> List.first |> String.to_integer
    game_topic = "game:" <> to_string(game_id)
    {:ok, _response, socket1} = subscribe_and_join(socket1, GameChannel, game_topic)
    push socket1, "editor:text", %{editor_text: "asdkfljlksajfd"}

    #bot join game
    :timer.sleep(@timeout + 50)

    #bot win game

    fsm = Server.fsm(game_id)
    assert fsm.data.second_player_editor_text == " "

    :timer.sleep(50)
    fsm = Server.fsm(game_id)
    assert fsm.data.second_player_editor_text == "t"

    :timer.sleep(50)
    fsm = Server.fsm(game_id)
    assert fsm.data.second_player_editor_text == "te"

    :timer.sleep(50)
    fsm = Server.fsm(game_id)
    assert fsm.data.second_player_editor_text == "tes"
  end

  test "wins the game if first player do nothing", %{socket1: socket1, conn1: conn1} do
    with_mocks([{Codebattle.CodeCheck.Checker, [], [check: fn(_a, _b, _c) -> {:ok, true} end]}]) do
    # Create game
      conn = post(conn1, game_path(conn1, :create))
      game_location = conn.resp_headers
                      |> Enum.find(&match?({"location", _}, &1))
                      |> elem(1)

      game_id = ~r/\d+/ |> Regex.run(game_location) |> List.first |> String.to_integer
      game_topic = "game:" <> to_string(game_id)
      {:ok, _response, socket1} = subscribe_and_join(socket1, GameChannel, game_topic)
      push socket1, "editor:text", %{editor_text: "asdkfljlksajfd"}

      #bot join game
      :timer.sleep(@timeout + 50)

      :timer.sleep(50 * 5)
      fsm = Server.fsm(game_id)

      assert fsm.state == :player_won
      assert fsm.data.winner.name == "superPlayer"
    end
  end

  test "gracefully terminates process after over the game", %{socket1: socket1, conn1: conn1} do
    with_mocks([{Codebattle.CodeCheck.Checker, [], [check: fn(_a, _b, _c) -> {:ok, true} end]}]) do
      # Create game
      conn = post(conn1, game_path(conn1, :create))
      game_location = conn.resp_headers
                      |> Enum.find(&match?({"location", _}, &1))
                      |> elem(1)

      game_id = ~r/\d+/ |> Regex.run(game_location) |> List.first |> String.to_integer
      game_topic = "game:" <> to_string(game_id)
      {:ok, _response, socket1} = subscribe_and_join(socket1, GameChannel, game_topic)
      push socket1, "editor:text", %{editor_text: "asdkfljlksajfd"}

      # bot join game
      :timer.sleep(@timeout + 50)

      # bot win game
      :timer.sleep(50 * 5)


      # user1 check_result
      push socket1, "check_result", %{editor_text: "asdkfljlksajfd", lang: :js}

      :timer.sleep(50)
    end
  end
end
