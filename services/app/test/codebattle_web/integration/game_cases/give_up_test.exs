defmodule Codebattle.GameCases.GiveUpTest do
  use Codebattle.IntegrationCase

  import Mock

  alias Codebattle.GameProcess.{ActiveGames, Server}
  alias CodebattleWeb.UserSocket
  alias Codebattle.CodeCheck.CheckResult

  setup %{conn: conn} do
    insert(:task, level: "elementary")
    user1 = insert(:user)
    user2 = insert(:user)

    conn1 = put_session(conn, :user_id, user1.id)
    conn2 = put_session(conn, :user_id, user2.id)

    socket1 = socket(UserSocket, "user_id", %{user_id: user1.id, current_user: user1})
    socket2 = socket(UserSocket, "user_id", %{user_id: user2.id, current_user: user2})

    {:ok,
     %{conn1: conn1, conn2: conn2, socket1: socket1, socket2: socket2, user1: user1, user2: user2}}
  end

  test "first user gave up", %{
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
      |> get(user_path(conn1, :index))
      |> post(game_path(conn1, :create, level: "elementary"))

    game_id = game_id_from_conn(conn)

    game_topic = "game:" <> to_string(game_id)
    {:ok, _response, socket1} = subscribe_and_join(socket1, GameChannel, game_topic)

    # Second player join game
    post(conn2, game_path(conn2, :join, game_id))
    {:ok, _response, _socket2} = subscribe_and_join(socket2, GameChannel, game_topic)

    # First player give_up
    Phoenix.ChannelTest.push(socket1, "give_up", %{})
    :timer.sleep(70)
    {:ok, fsm} = Server.fsm(game_id)

    assert fsm.state == :game_over
    assert FsmHelpers.gave_up?(fsm, user1.id) == true
    assert FsmHelpers.winner?(fsm, user2.id) == true
    assert ActiveGames.game_exists?(game_id) == false
  end

  test "first user won, second gave up", %{
    conn1: conn1,
    conn2: conn2,
    socket1: socket1,
    socket2: socket2,
    user1: user1,
    user2: user2
  } do
    # Create game
    with_mocks [
      {Codebattle.CodeCheck.Checker, [], [check: fn _a, _b, _c -> %CheckResult{status: :ok, result: "asdf", output: "asdf"} end]}
    ] do
      conn =
        conn1
        |> get(user_path(conn1, :index))
        |> post(game_path(conn1, :create, level: "elementary"))

      game_id = game_id_from_conn(conn)

      game_topic = "game:" <> to_string(game_id)
      {:ok, _response, socket1} = subscribe_and_join(socket1, GameChannel, game_topic)

      # Second player join game
      post(conn2, game_path(conn2, :join, game_id))
      {:ok, _response, _socket2} = subscribe_and_join(socket2, GameChannel, game_topic)

      # First player give_up
      Phoenix.ChannelTest.push(socket1, "check_result", %{editor_text: "won", lang: "js"})
      Phoenix.ChannelTest.push(socket1, "give_up", %{})
      :timer.sleep(70)
      {:ok, fsm} = Server.fsm(game_id)

      assert fsm.state == :game_over
      assert FsmHelpers.winner?(fsm, user1.id) == true
      assert FsmHelpers.lost?(fsm, user2.id) == true
    end
  end

  test "After give_up user can create games", %{conn1: conn1, conn2: conn2, socket1: socket1} do
    conn =
      conn1
      |> get(page_path(conn1, :index))
      |> post(game_path(conn1, :create, level: "elementary"))

    game_id = game_id_from_conn(conn)

    game_topic = "game:" <> to_string(game_id)
    {:ok, _response, socket1} = subscribe_and_join(socket1, GameChannel, game_topic)

    conn2
    |> get(game_path(conn2, :show, game_id))
    |> follow_button("Join")

    Phoenix.ChannelTest.push(socket1, "give_up", %{})

    :timer.sleep(100)

    {:ok, fsm} = Server.fsm(game_id)

    assert fsm.state == :game_over

    conn =
      conn1
      |> get(page_path(conn1, :index))
      |> post(game_path(conn, :create, level: "elementary"))

    game_id = game_id_from_conn(conn)

    {:ok, fsm} = Server.fsm(game_id)

    assert fsm.state == :waiting_opponent
  end
end
