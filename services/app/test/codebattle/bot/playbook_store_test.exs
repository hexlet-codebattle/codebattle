defmodule Codebattle.Bot.PlaybookStoreTest do
  use Codebattle.IntegrationCase

  alias CodebattleWeb.{GameChannel, UserSocket}
  # alias Codebattle.Bot.Playbook
  # alias Codebattle.Repo
  alias CodebattleWeb.UserSocket

  setup %{conn: conn} do
    task = insert(:task)
    user1 = insert(:user, %{name: "first", email: "test1@test.test", github_id: 1, rating: 1000})
    user2 = insert(:user, %{name: "second", email: "test2@test.test", github_id: 2, rating: 1000})

    # user3 = insert(:user, %{name: "other", email: "test3@test.test", github_id: 3, rating: 1000})

    conn1 = put_session(conn, :user_id, user1.id)
    conn2 = put_session(conn, :user_id, user2.id)

    socket1 = socket(UserSocket, "user_id", %{user_id: user1.id, current_user: user1})
    socket2 = socket(UserSocket, "user_id", %{user_id: user2.id, current_user: user2})

    {:ok,
     %{
       conn1: conn1,
       conn2: conn2,
       user1: user1,
       user2: user2,
       task: task,
       socket1: socket1,
       socket2: socket2
     }}
  end

  test "stores player playbook if he is winner", %{
    conn1: conn1,
    conn2: conn2,
    user1: _user1,
    user2: _user2,
    task: _task,
    socket1: socket1,
    socket2: socket2
  } do
    # Create game
    conn =
      conn1
      |> get(page_path(conn1, :index))
      |> post(game_path(conn1, :create, level: "easy"))

    game_id = game_id_from_conn(conn)

    game_topic = "game:" <> to_string(game_id)
    #
    # Second player join game
    post(conn2, game_path(conn2, :join, game_id))

    editor_text1 = "t"
    editor_text2 = "te"
    editor_text3 = "tes"
    editor_text4 = "testf"

    {:ok, _response, socket1} = subscribe_and_join(socket1, GameChannel, game_topic)
    {:ok, _response, _socket2} = subscribe_and_join(socket2, GameChannel, game_topic)
    Mix.Shell.Process.flush()

    Phoenix.ChannelTest.push(socket1, "editor:data", %{editor_text: editor_text1, lang: "js"})
    :timer.sleep(40)
    Phoenix.ChannelTest.push(socket1, "editor:data", %{editor_text: editor_text2, lang: "js"})
    :timer.sleep(40)

    Phoenix.ChannelTest.push(socket1, "editor:data", %{
      "editor_text" => editor_text2,
      "lang" => "elixir"
    })

    :timer.sleep(40)
    Phoenix.ChannelTest.push(socket1, "editor:data", %{editor_text: editor_text3, lang: "elixir"})
    :timer.sleep(500)
    Phoenix.ChannelTest.push(socket1, "editor:data", %{editor_text: editor_text4, lang: "elixir"})
    :timer.sleep(40)

    Phoenix.ChannelTest.push(socket1, "check_result", %{editor_text: editor_text4, lang: "elixir"})

    #       playbook = [
    #         %{"type" => "game_complete", "user_id" => 1, "time" => ....},
    #         %{"type" => "result_check", "user_id" => 1, "result" => ..., "output" => ..., "time" => ....},
    #         %{"type" => "start_check", "user_id" => 1, "editor_lang" => "elixir", "editor_text" => "testf", "time" => ....}
    #         %{"type" => "editor_text", "editor_text" => "testf","user_id" => 1, "time" => ....},
    #         %{"type" => "editor_text", "editor_text" => "tes","user_id" => 1, "time" => ....},
    #         %{"type" => "editor_lang", "editor_lang" => "elixir","user_id" => 1, "time" => ....},
    #         %{"type" => "editor_text", "editor_text" => "te","user_id" => 1, "time" => ....},
    #         %{"type" => "editor_text", "editor_text" => "t","user_id" => 1, "time" => ....},
    #       ]

    # sleep, because GameProcess need time to write Playbook with Ecto.connection
    :timer.sleep(400)
    {:ok, playbook} = Codebattle.GameProcess.Server.playbook(game_id)
    # playbook = Repo.get_by(Playbook, user_id: user1.id)
    assert Enum.count(playbook) == 8

    # assert Enum.all?(playbook.data["playbook"], fn x -> x["time"] <= 3000 end) == true
  end
end
