defmodule Codebattle.Bot.PlaybookPlayTest do
  use Codebattle.IntegrationCase

  alias CodebattleWeb.{GameChannel, UserSocket}
  alias Codebattle.GameProcess.{Server, FsmHelpers}
  alias CodebattleWeb.UserSocket

  test "Bot playing with user", %{conn: conn} do
    task = insert(:task, level: "easy")
    user = insert(:user, %{name: "first", email: "test1@test.test", github_id: 1, rating: 1400})

    conn = put_session(conn, :user_id, user.id)

    playbook_data = %{
      players: [%{id: 2, total_time_ms: 1_000_000}],
      records: [
        %{"type" => "init", "id" => 2, "editor_text" => "", "editor_lang" => "ruby"},
        %{
          "diff" => %{"delta" => [%{"insert" => "t"}], "next_lang" => "ruby", "time" => 20},
          "type" => "update_editor_data",
          "id" => 2
        },
        %{
          "diff" => %{
            "delta" => [%{"retain" => 1}, %{"insert" => "e"}],
            "next_lang" => "ruby",
            "time" => 20
          },
          "type" => "update_editor_data",
          "id" => 2
        },
        %{
          "diff" => %{
            "delta" => [%{"retain" => 2}, %{"insert" => "s"}],
            "next_lang" => "ruby",
            "time" => 20
          },
          "type" => "update_editor_data",
          "id" => 2
        },
        %{"type" => "game_over", "id" => 2, "lang" => "ruby"}
      ]
    }

    insert(:playbook, %{
      data: playbook_data,
      task: task,
      winner_id: 2,
      winner_lang: "ruby",
      is_complete_solution: true
    })

    socket = socket(UserSocket, "user_id", %{user_id: user.id, current_user: user})

    # Create game
    level = "easy"
    {:ok, fsm, bot} = Codebattle.Bot.GameCreator.call(level)
    game_id = FsmHelpers.get_game_id(fsm)
    game_topic = "game:#{game_id}"

    # Run bot
    # {:ok, _pid} = Codebattle.Bot.Server.create_server(%{game_id: game_id, bot: bot})
    Codebattle.Bot.Server.ping(game_id) |> IO.inspect

    :timer.sleep(100)

    # User join to the game
    post(conn, Routes.game_path(conn, :join, game_id))

    {:ok, _response, _socket} = subscribe_and_join(socket, GameChannel, game_topic)
    :timer.sleep(100)

    {:ok, fsm} = Server.get_fsm(game_id)
    assert fsm.state == :playing

    :timer.sleep(6000)
    # bot write_some_text
    {:ok, fsm} = Server.get_fsm(game_id)

    assert FsmHelpers.get_first_player(fsm).editor_text == "tes"
    assert FsmHelpers.get_winner(fsm).name == bot.name
  end
end
