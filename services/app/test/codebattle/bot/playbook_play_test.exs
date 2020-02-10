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
      players: %{2 => %{total_time_ms: 1_000_000}},
      playbook: [
        %{"type" => "init", "id" => 2, "editor_text" => "", "editor_lang" => "ruby"},
        %{
          "diff" => %{"delta" => [%{"insert" => "t"}], "time" => 20},
          "type" => "editor_text",
          "id" => 2
        },
        %{
          "diff" => %{"delta" => [%{"retain" => 1}, %{"insert" => "e"}], "time" => 20},
          "type" => "editor_text",
          "id" => 2
        },
        %{
          "diff" => %{"delta" => [%{"retain" => 2}, %{"insert" => "s"}], "time" => 20},
          "type" => "editor_text",
          "id" => 2
        },
        %{
          "diff" => %{"prev_lang" => "ruby", "next_lang" => "ruby", "time" => 100},
          "type" => "editor_lang",
          "id" => 2
        },
        %{"type" => "game_complete", "id" => 2, "lang" => "ruby"}
      ]
    }

    insert(:playbook, %{data: playbook_data, task: task, winner_id: 2, winner_lang: "ruby"})

    socket = socket(UserSocket, "user_id", %{user_id: user.id, current_user: user})

    # Create game
    level = "easy"
    {:ok, game_id, bot} = Codebattle.Bot.GameCreator.call(level)
    game_topic = "game:#{game_id}"

    # Run bot
    {:ok, _pid} = Codebattle.Bot.PlaybookAsyncRunner.create_server(%{game_id: game_id, bot: bot})

    :timer.sleep(100)

    # User join to the game
    post(conn, game_path(conn, :join, game_id))

    {:ok, _response, _socket} = subscribe_and_join(socket, GameChannel, game_topic)
    :timer.sleep(100)

    {:ok, fsm} = Server.fsm(game_id)
    assert fsm.state == :playing

    :timer.sleep(6000)
    # bot write_some_text
    {:ok, fsm} = Server.fsm(game_id)

    assert FsmHelpers.get_first_player(fsm).editor_text == "tes"
    assert FsmHelpers.get_winner(fsm).name == bot.name
  end
end
