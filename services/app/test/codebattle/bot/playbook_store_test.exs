defmodule Codebattle.Bot.PlaybookStoreTest do
  use Codebattle.IntegrationCase

  alias CodebattleWeb.{GameChannel, UserSocket}
  alias Codebattle.Bot.Playbook
  # alias Codebattle.Repo
  alias CodebattleWeb.UserSocket

  setup %{conn: conn} do
    task = insert(:task)
    user1 = insert(:user, %{name: "first", email: "test1@test.test", github_id: 1, rating: 1000})
    user2 = insert(:user, %{name: "second", email: "test2@test.test", github_id: 2, rating: 1000})

    conn2 = put_session(conn, :user_id, user2.id)

    socket1 = socket(UserSocket, "user_id", %{user_id: user1.id, current_user: user1})
    socket2 = socket(UserSocket, "user_id", %{user_id: user2.id, current_user: user2})

    {:ok,
     %{
       conn2: conn2,
       user1: user1,
       user2: user2,
       task: task,
       socket1: socket1,
       socket2: socket2
     }}
  end

  test "stores player playbook if he is winner", %{
    conn2: conn2,
    user1: user1,
    user2: user2,
    task: task,
    socket1: socket1,
    socket2: socket2
  } do
    # Create game
    {:ok, _response, socket1} = subscribe_and_join(socket1, LobbyChannel, "lobby")

    ref = Phoenix.ChannelTest.push(socket1, "game:create", %{level: "easy"})
    Phoenix.ChannelTest.assert_reply(ref, :ok, %{game_id: game_id})

    game_topic = "game:" <> to_string(game_id)
    #
    # Second player join game
    post(conn2, Routes.game_path(conn2, :join, game_id))

    editor_text1 = "t"
    editor_text2 = "te"
    editor_text3 = "tes"
    editor_text4 = "testf"

    {:ok, _response, socket1} = subscribe_and_join(socket1, GameChannel, game_topic)
    {:ok, _response, _socket2} = subscribe_and_join(socket2, GameChannel, game_topic)
    Mix.Shell.Process.flush()

    Phoenix.ChannelTest.push(socket1, "editor:data", %{editor_text: editor_text1, lang_slug: "js"})

    :timer.sleep(40)

    Phoenix.ChannelTest.push(socket1, "editor:data", %{editor_text: editor_text2, lang_slug: "js"})

    :timer.sleep(40)

    Phoenix.ChannelTest.push(socket1, "editor:data", %{
      editor_text: editor_text2,
      lang_slug: "elixir"
    })

    :timer.sleep(40)

    Phoenix.ChannelTest.push(socket1, "editor:data", %{
      editor_text: editor_text3,
      lang_slug: "elixir"
    })

    :timer.sleep(500)

    Phoenix.ChannelTest.push(socket1, "editor:data", %{
      editor_text: editor_text4,
      lang_slug: "elixir"
    })

    :timer.sleep(40)

    Phoenix.ChannelTest.push(socket1, "check_result", %{
      editor_text: editor_text4,
      lang_slug: "elixir"
    })

    #       playbook = [
    #         %{type: "check_complete", id: 1, time: ....},
    #         %{type: "result_check", id: 1, result: ..., output: ..., time: ....},
    #         %{type: "start_check", id: 1, editor_lang: "elixir", editor_text: "testf", time: ....}
    #         %{type: "editor_text", editor_text: "testf", id: 1, time: ....},
    #         %{type: "editor_text", editor_text: "tes", id: 1, time: ....},
    #         %{type: "editor_lang", editor_lang: "elixir", id: 1, time: ....},
    #         %{type: "editor_text", editor_text: "te", id: 1, time: ....},
    #         %{type: "editor_text", editor_text: "t", id: 1, time: ....},
    #         %{type: "editor_text", editor_text: "t", id: 1, time: ....},
    #         %{type: :init, editor_text: "t", editor_lang: "js", id: 1, time: ....},
    #         %{type: :init, editor_text: ..., editor_lang: "js", id: 2, time: ....},
    #       ]

    # sleep, because Game need time to write Playbook with Ecto.connection
    :timer.sleep(1000)

    playbook = Repo.get_by(Playbook, winner_id: user1.id)
    task_id = task.id
    user1_id = user1.id
    user2_id = user2.id

    assert %Codebattle.Bot.Playbook{
             data: %Codebattle.Bot.Playbook.Data{
               count: 10,
               players: [
                 %{
                   check_result: %{output: "", result: ""},
                   editor_lang: "js",
                   editor_text:
                     "const _ = require(\"lodash\");\nconst R = require(\"rambda\");\n\nconst solution = (a, b) => {\n\treturn 0;\n};\n\nmodule.exports = solution;",
                   id: ^user2_id,
                   name: "second",
                   record_id: 1,
                   total_time_ms: 0,
                   type: "player_state"
                 },
                 %{
                   check_result: %{output: "", result: ""},
                   editor_lang: "elixir",
                   editor_text: "testf",
                   id: ^user1_id,
                   name: "first",
                   record_id: 0,
                   type: "player_state"
                 }
               ],
               records: [
                 %{
                   check_result: %{output: "", result: ""},
                   editor_lang: "js",
                   editor_text:
                     "const _ = require(\"lodash\");\nconst R = require(\"rambda\");\n\nconst solution = (a, b) => {\n\treturn 0;\n};\n\nmodule.exports = solution;",
                   id: ^user1_id,
                   name: "first",
                   record_id: 0,
                   type: "init"
                 },
                 %{
                   check_result: %{output: "", result: ""},
                   editor_lang: "js",
                   editor_text:
                     "const _ = require(\"lodash\");\nconst R = require(\"rambda\");\n\nconst solution = (a, b) => {\n\treturn 0;\n};\n\nmodule.exports = solution;",
                   id: ^user2_id,
                   name: "second",
                   record_id: 1,
                   type: "init"
                 },
                 %{
                   diff: %{delta: [%{delete: 4}, %{retain: 1}, %{delete: 124}]},
                   id: ^user1_id,
                   record_id: 2,
                   type: "update_editor_data"
                 },
                 %{
                   diff: %{delta: [%{retain: 1}, %{insert: "e"}]},
                   id: ^user1_id,
                   record_id: 3,
                   type: "update_editor_data"
                 },
                 %{
                   diff: %{delta: [], next_lang: "elixir"},
                   id: ^user1_id,
                   record_id: 4,
                   type: "update_editor_data"
                 },
                 %{
                   diff: %{delta: [%{retain: 2}, %{insert: "s"}]},
                   id: ^user1_id,
                   record_id: 5,
                   type: "update_editor_data"
                 },
                 %{
                   diff: %{delta: [%{retain: 3}, %{insert: "tf"}]},
                   id: ^user1_id,
                   record_id: 6,
                   type: "update_editor_data"
                 },
                 %{
                   editor_lang: "elixir",
                   editor_text: "testf",
                   id: ^user1_id,
                   record_id: 7,
                   type: "start_check"
                 },
                 %{
                   check_result: %{
                     asserts: [],
                     asserts_count: 0,
                     output: "asdf",
                     result: "asdf",
                     status: "ok",
                     success_count: 0
                   },
                   editor_lang: "elixir",
                   editor_text: "testf",
                   id: ^user1_id,
                   record_id: 8,
                   type: "check_complete"
                 },
                 %{
                   id: ^user1_id,
                   lang: "elixir",
                   record_id: 9,
                   type: "game_over"
                 }
               ]
             },
             game_id: ^game_id,
             winner_id: ^user1_id,
             solution_type: "complete",
             task_id: ^task_id,
             winner_lang: "elixir"
           } = playbook

    user_playbook =
      Enum.filter(playbook.data.records, fn x ->
        x.id == user1.id && x.type == "update_editor_data"
      end)

    assert Enum.all?(user_playbook, fn x -> x.diff.time <= 3000 end) == true
  end
end
