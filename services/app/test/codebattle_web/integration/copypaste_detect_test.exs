defmodule Codebattle.PlayGameTest do
  use Codebattle.IntegrationCase

  import Mock

  alias Codebattle.GameProcess.Server
  alias CodebattleWeb.UserSocket

  setup %{conn: conn} do
    insert(:task)
    user1 = insert(:user, %{name: "first", email: "test1@test.test", github_id: 1, rating: 1000})
    user2 = insert(:user, %{name: "second", email: "test2@test.test", github_id: 2, rating: 1000})

    conn1 = put_session(conn, :user_id, user1.id)
    conn2 = put_session(conn, :user_id, user2.id)

    socket1 = socket(UserSocket, "user_id", %{user_id: user1.id, current_user: user1})
    socket2 = socket(UserSocket, "user_id", %{user_id: user2.id, current_user: user2})

    {:ok,
     %{
       conn1: conn1,
       conn2: conn2,
       socket1: socket1,
       socket2: socket2,
       user1: user1,
       user2: user2,
     }}
  end

  test "Detect uer copypaste", %{
    conn1: conn1,
    conn2: conn2,
    socket1: socket1,
    socket2: socket2,
    user1: user1,
    user2: user2
  } do
      # Create game
      conn =
        conn1
        |> get(page_path(conn1, :index))
        |> post(game_path(conn1, :create, level: "easy"))

      game_id = game_id_from_conn(conn)

      game_topic = "game:" <> to_string(game_id)
      {:ok, _response, socket1} = subscribe_and_join(socket1, GameChannel, game_topic)

      # Second player join game
      post(conn2, game_path(conn2, :join, game_id))
      {:ok, _response, socket2} = subscribe_and_join(socket2, GameChannel, game_topic)
      fsm = Server.fsm(game_id)

      # First player copypaste detected
      editor_text1 = "the whole solution"
      editor_text2 = "the"
      editor_text3 = " whole "
      editor_text4 = "solution"

      Phoenix.ChannelTest.push(socket1, "editor:data", %{editor_text: editor_text1})
      Phoenix.ChannelTest.push(socket1, "check_result", %{editor_text: editor_text1, lang: "js"})
      :timer.sleep(100)

      fsm = Server.fsm(game_id)

      assert fsm.state == :playing

      payload = %{
        user_id: user1.id
      }
      assert_receive %Phoenix.Socket.Broadcast{
        event: "user:copypast_detected",
        payload: ^payload
      }

      # Second player win game
      Phoenix.ChannelTest.push(socket2, "editor:data", %{editor_text: editor_text2})
      Phoenix.ChannelTest.push(socket2, "editor:data", %{editor_text: editor_text3})
      Phoenix.ChannelTest.push(socket2, "editor:data", %{editor_text: editor_text4})
      Phoenix.ChannelTest.push(socket2, "check_result", %{editor_text: editor_text2}, lang: "js")
      :timer.sleep(100)

      game = Repo.get(Game, game_id)
      user1 = Repo.get(User, user1.id)
      user2 = Repo.get(User, user2.id)
      user_game1 = Repo.get_by(UserGame, user_id: user1.id)
      user_game2 = Repo.get_by(UserGame, user_id: user2.id)

      assert game.state == "game_over"

      assert user_game1.creator == true
      assert user_game1.result == "lost"
      assert user_game2.creator == false
      assert user_game2.result == "won"
    end
end
