defmodule Codebattle.Bot.PlaybookPlayTest do
  use Codebattle.IntegrationCase

  import Mock

  alias CodebattleWeb.GameChannel
  alias Codebattle.GameProcess.{Server, FsmHelpers}

  @timeout Application.get_env(:codebattle, Codebattle.Bot)[:timeout]

  @tag :skip
  test "Bot playing with user", %{conn: conn} do
    user = insert(:user)
    task = insert(:task)

    playbook_data = %{
      playbook: [
        %{"delta" => [%{"insert" => "t"}], "time" => 20},
        %{"delta" => [%{"retain" => 1}, %{"insert" => "e"}], "time" => 20},
        %{"delta" => [%{"retain" => 2}, %{"insert" => "s"}], "time" => 20},
        %{"lang" => "ruby", "time" => 100}
      ]
    }

    insert(:bot_playbook, %{data: playbook_data, task_id: task.id})

    socket = socket("user_id", %{user_id: user.id, current_user: user})

    with_mocks [{Codebattle.CodeCheck.Checker, [], [check: fn _a, _b, _c -> {:ok, true} end]}] do
      # Create game
      conn =
        conn
        |> put_session(:user_id, user.id)
        |> post(game_path(conn, :create))

      game_location =
        conn.resp_headers
        |> Enum.find(&match?({"location", _}, &1))
        |> elem(1)

      game_id = ~r/\d+/ |> Regex.run(game_location) |> List.first() |> String.to_integer()
      game_topic = "game:" <> to_string(game_id)
      {:ok, _response, socket} = subscribe_and_join(socket, GameChannel, game_topic)
      Phoenix.ChannelTest.push(socket, "editor:data", %{editor_text: "asdkfljlksajfd"})

      :timer.sleep(@timeout - 10)
      fsm = Server.fsm(game_id)
      assert fsm.state == :waiting_opponent

      # bot join game
      :timer.sleep(300)
      fsm = Server.fsm(game_id)
      assert FsmHelpers.get_second_player(fsm).editor_text == "tes"

      # bot win the game
      :timer.sleep(300)
      fsm = Server.fsm(game_id)

      assert fsm.state == :game_over
      assert FsmHelpers.get_winner(fsm).name == "superPlayer"
    end
  end
end
