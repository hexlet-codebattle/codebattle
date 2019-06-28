defmodule Codebattle.RecordBotPlaybooksTest do
  use Codebattle.IntegrationCase

  import Mock

  alias Codebattle.GameProcess.Server
  alias CodebattleWeb.UserSocket
  alias Codebattle.Bot.Playbook

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
       user2: user2
     }}
  end

  test "Record bot playbooks", %{
    conn1: conn1,
    conn2: conn2,
    socket1: socket1,
    socket2: socket2,
    user1: _user1,
    user2: _user2
  } do
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
      {:ok, _response, socket1} = subscribe_and_join(socket1, GameChannel, game_topic)

      fsm = Server.fsm(game_id)

      assert fsm.state == :waiting_opponent
      assert FsmHelpers.get_first_player(fsm).name == "first"
      assert FsmHelpers.get_second_player(fsm) == nil

      # Second player join game
      post(conn2, game_path(conn2, :join, game_id))
      {:ok, _response, _socket2} = subscribe_and_join(socket2, GameChannel, game_topic)
      fsm = Server.fsm(game_id)

      assert fsm.state == :playing
      assert FsmHelpers.get_first_player(fsm).name == "first"
      assert FsmHelpers.get_second_player(fsm).name == "second"
      assert FsmHelpers.get_first_player(fsm).editor_text == "module.exports = (a, b) => {\n\treturn 0;\n};"
      assert FsmHelpers.get_second_player(fsm).editor_text == "module.exports = (a, b) => {\n\treturn 0;\n};"

      # First player won
      editor_text1 = "Hello world1!"
      # editor_text2 = "Hello world2!"

      Phoenix.ChannelTest.push(socket1, "check_result", %{editor_text: editor_text1, lang: "js"})
      :timer.sleep(100)
      fsm = Server.fsm(game_id)
      assert fsm.state == :game_over
      assert FsmHelpers.get_first_player(fsm).name == "first"
      assert FsmHelpers.get_second_player(fsm).name == "second"
      assert FsmHelpers.get_winner(fsm).name == "first"
      assert FsmHelpers.get_first_player(fsm).editor_text == "Hello world1!"
      assert FsmHelpers.get_second_player(fsm).editor_text == "module.exports = (a, b) => {\n\treturn 0;\n};"

      :timer.sleep(100)
      playbooks = Repo.all(Playbook)
      assert Enum.count(playbooks) == 1
    end
  end
end
