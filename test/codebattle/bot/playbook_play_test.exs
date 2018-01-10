defmodule Codebattle.Bot.PlaybookPlayTest do
  use Codebattle.IntegrationCase

  import Mock

  alias CodebattleWeb.GameChannel
  alias Codebattle.GameProcess.{Server, FsmHelpers}

  @timeout Application.get_env(:codebattle, Codebattle.Bot)[:timeout]

  setup do
    playbook_data = %{playbook: [
      %{"delta" => [%{"insert" => "t"}], "time" => 20},
      %{"delta" => [%{"retain" => 1}, %{"insert" => "e"}], "time" => 20},
      %{"delta" => [%{"retain" => 2}, %{"insert" => "s"}], "time" => 20},
      %{"lang" => :ruby, "time" => 100}
    ]}

    user1 = insert(:user)
    task = insert(:task)
    bot = insert(:user, id: 0)

    playbook = insert(:bot_playbook, %{data: playbook_data, task_id: task.id})

    conn1 = assign(build_conn(), :user, user1)

    socket1 = socket("user_id", %{user_id: user1.id, current_user: user1})

    {:ok, %{user1: user1, socket1: socket1, conn1: conn1, task: task, playbook: playbook, bot: bot}}
  end

  test "Bot playing with user", %{socket1: socket1, conn1: conn1} do
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

      :timer.sleep(@timeout - 10)
      fsm = Server.fsm(game_id)
      assert fsm.state == :waiting_opponent

      #bot join game
      :timer.sleep(400)
      fsm = Server.fsm(game_id)
      assert FsmHelpers.get_second_player(fsm).editor_text == "tes"

      #bot win the game
      :timer.sleep(300)
      fsm = Server.fsm(game_id)

      assert fsm.state == :player_won
      assert FsmHelpers.get_winner(fsm).name == "superPlayer"
    end
  end
end
