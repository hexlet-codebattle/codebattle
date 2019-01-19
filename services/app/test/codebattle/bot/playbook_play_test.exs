defmodule Codebattle.Bot.PlaybookPlayTest do
  use Codebattle.IntegrationCase

  import Mock

  alias CodebattleWeb.{GameChannel, UserSocket}
  alias Codebattle.GameProcess.{Server, FsmHelpers}
  alias CodebattleWeb.UserSocket

  @timeout Application.get_env(:codebattle, Codebattle.Bot)[:timeout]

  test "Bot playing with user", %{conn: conn} do
    task = insert(:task)
    user1 = insert(:user, %{name: "first", email: "test1@test.test", github_id: 1, rating: 1000})
    user2 = insert(:user, %{name: "second", email: "test2@test.test", github_id: 2, rating: 1000})

    conn1 = put_session(conn, :user_id, user1.id)
    conn2 = put_session(conn, :user_id, user2.id)

    socket1 = socket(UserSocket, "user_id", %{user_id: user1.id, current_user: user1})
    socket2 = socket(UserSocket, "user_id", %{user_id: user2.id, current_user: user2})
    playbook_data = %{
      playbook: [
        %{"delta" => [%{"insert" => "t"}], "time" => 20},
        %{"delta" => [%{"retain" => 1}, %{"insert" => "e"}], "time" => 20},
        %{"delta" => [%{"retain" => 2}, %{"insert" => "s"}], "time" => 20},
        %{"lang" => "ruby", "time" => 100}
      ]
    }

    insert(:bot_playbook, %{data: playbook_data, task_id: task.id})

    socket = socket(UserSocket, "user_id", %{user_id: user.id, current_user: user})

    with_mocks [
      {Codebattle.CodeCheck.Checker, [], [check: fn _a, _b, _c -> {:ok, "asdf", "asdf"} end]}
    ] do
      # Create game
      conn =
        conn1
        |> get(page_path(conn1, :index))
        |> post(game_path(conn1, :create, level: "easy"))

      game_id = game_id_from_conn(conn)

      game_topic = "game:" <> to_string(game_id)

      # Second player join game
      post(conn2, game_path(conn2, :join, game_id))

      {:ok, _response, socket1} = subscribe_and_join(socket1, GameChannel, game_topic)
      {:ok, _response, socket2} = subscribe_and_join(socket2, GameChannel, game_topic)
      Phoenix.ChannelTest.push(socket1, "editor:data", %{editor_text: "asdkfljlksajfd"})

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
