defmodule Codebattle.Bot.PlaybookPlayTest do
  use Codebattle.IntegrationCase

  alias CodebattleWeb.{GameChannel, UserSocket}
  alias Codebattle.Game.{Server, Helpers}
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
      solution_type: "complete"
    })

    socket = socket(UserSocket, "user_id", %{user_id: user.id, current_user: user})

    # Create game
    level = "easy"
    {:ok, fsm} = Codebattle.Bot.GameCreator.call(level)
    bot = Helpers.get_first_player(fsm)
    game_id = Helpers.get_game_id(fsm)
    game_topic = "game:#{game_id}"

    :timer.sleep(100)

    # User join to the game
    post(conn, Routes.game_path(conn, :join, game_id))
    :timer.sleep(100)

    {:ok, _response, socket} = subscribe_and_join(socket, GameChannel, game_topic)
    :timer.sleep(3_000)

    Phoenix.ChannelTest.push(socket, "editor:data", %{editor_text: "test", lang_slug: "js"})
    :timer.sleep(100)

    {:ok, fsm} = Server.get_game(game_id)
    assert fsm.state == :playing

    :timer.sleep(3_000)
    # bot write_some_text
    {:ok, fsm} = Server.get_game(game_id)

    assert Helpers.get_first_player(fsm).editor_text == "tes"
    assert Helpers.get_winner(fsm).name == bot.name
  end
end
