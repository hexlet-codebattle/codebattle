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

    # user3 = insert(:user, %{name: "other", email: "test3@test.test", github_id: 3, rating: 1000})

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
    user2: _user2,
    task: _task,
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
    :timer.sleep(4000)

    # TODO: think why not 10
    playbook = Repo.get_by(Playbook, winner_id: user1.id)
    assert Enum.count(playbook.data.records) == 9

    user_playbook =
      Enum.filter(playbook.data.records, fn x ->
        x["id"] == user1.id && x["type"] == "update_editor_data"
      end)

    assert Enum.all?(user_playbook, fn x -> x["diff"]["time"] <= 3000 end) == true
  end
end
