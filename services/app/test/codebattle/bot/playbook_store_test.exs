defmodule Codebattle.Bot.PlaybookStoreTest do
  use Codebattle.IntegrationCase

  import Mock

  alias CodebattleWeb.{GameChannel, UserSocket}
  alias Codebattle.Bot.Playbook
  alias Codebattle.Repo
  alias Codebattle.GameProcess.Player
  alias CodebattleWeb.UserSocket

  setup %{conn: conn} do
    task = insert(:task)
    user1 = insert(:user, %{name: "first", email: "test1@test.test", github_id: 1, rating: 1000})
    user2 = insert(:user, %{name: "second", email: "test2@test.test", github_id: 2, rating: 1000})
    user3 = insert(:user, %{name: "other", email: "test3@test.test", github_id: 3, rating: 1000})

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
    user1: user1,
    user2: user2,
    task: task,
    socket1: socket1,
    socket2: socket2
  } do
    with_mocks [
      {Codebattle.CodeCheck.Checker, [],
       [
         check: fn _a, _b, _c -> {:ok, "adsf", "asdf"} end
       ]}
    ] do

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
      editor_text3 = "tesghjkhkjh"
      editor_text4 = "flksjdf"

      {:ok, _response, socket1} = subscribe_and_join(socket1, GameChannel, game_topic)
      {:ok, _response, _socket2} = subscribe_and_join(socket2, GameChannel, game_topic)
      Mix.Shell.Process.flush()

      Phoenix.ChannelTest.push(socket1, "editor:data", %{editor_text: editor_text1})
      :timer.sleep(40)
      Phoenix.ChannelTest.push(socket1, "editor:data", %{editor_text: editor_text2})
      :timer.sleep(40)
      Phoenix.ChannelTest.push(socket1, "editor:data", %{"editor_text" => editor_text2, "lang" => "elixir"})
      :timer.sleep(40)
      Phoenix.ChannelTest.push(socket1, "editor:data", %{editor_text: editor_text3})
      :timer.sleep(40)
      Phoenix.ChannelTest.push(socket1, "editor:data", %{editor_text: editor_text4})
      :timer.sleep(40)
      Phoenix.ChannelTest.push(socket1, "check_result", %{editor_text: editor_text4, lang: "js"})

#       playbook = [
#         %{"delta" => [%{"insert" => "t"}], "time" => 100},
#         %{"delta" => [%{"retain" => 1}, %{"insert" => "e"}], "time" => 100},
#         %{"delta" => [%{"retain" => 2}, %{"insert" => "s"}], "time" => 100},
#         %{"delta" => [], "time" => 100},
#         %{"lang" => "js", "time" => 100},
#         %{"delta" => [], "time" => 100},
#         %{"lang" => "js", "time" => 100}
#       ]


      # sleep, because GameProcess need time to write Playbook with Ecto.connection
      :timer.sleep(400)
      playbook = Repo.get_by(Playbook, user_id: user1.id)
      assert Enum.count(playbook.data["playbook"]) == 8
    end
  end
end
