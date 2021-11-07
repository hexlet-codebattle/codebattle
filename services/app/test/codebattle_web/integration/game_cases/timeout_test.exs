defmodule Codebattle.GameCases.TimeoutTest do
  use Codebattle.IntegrationCase

  alias Codebattle.Game.{ActiveGames, Server}
  alias CodebattleWeb.UserSocket

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

  test "game timed out", %{
    conn1: conn1,
    conn2: conn2,
    socket1: socket1,
    socket2: socket2,
    user1: _user1,
    user2: _user2
  } do
    # Create game
    conn =
      conn1
      |> get(user_path(conn1, :index))
      |> post(
        game_path(conn1, :create,
          level: "elementary",
          timeout_seconds: 60,
          type: "withRandomPlayer"
        )
      )

    game_id = game_id_from_conn(conn)

    game_topic = "game:" <> to_string(game_id)
    {:ok, _response, _socket1} = subscribe_and_join(socket1, GameChannel, game_topic)

    # Second player join game
    post(conn2, game_path(conn2, :join, game_id))
    {:ok, _response, _socket2} = subscribe_and_join(socket2, GameChannel, game_topic)
    :timer.sleep(70)

    Codebattle.Game.Play.timeout_game(game_id)

    assert {:error, :game_terminated} = Server.get_fsm(game_id)
    assert %{state: "timeout"} = Codebattle.Game.Play.get_game(game_id)

    assert ActiveGames.game_exists?(game_id) == false
  end

  test "After timeout user can create games", %{conn1: conn1, conn2: conn2, socket1: socket1} do
    conn =
      conn1
      |> get(Routes.page_path(conn1, :index))
      |> post(
        game_path(conn1, :create,
          level: "elementary",
          type: "withRandomPlayer"
        )
      )

    game_id = game_id_from_conn(conn)

    game_topic = "game:" <> to_string(game_id)
    subscribe_and_join(socket1, GameChannel, game_topic)

    conn2
    |> get(game_path(conn2, :show, game_id))
    |> follow_button("Join")

    Codebattle.Game.Play.timeout_game(game_id)

    assert {:error, :game_terminated} = Server.get_fsm(game_id)
    assert %{state: "timeout"} = Codebattle.Game.Play.get_game(game_id)

    conn =
      conn1
      |> get(Routes.page_path(conn1, :index))
      |> post(Routes.game_path(conn, :create, level: "elementary", type: "withRandomPlayer"))

    game_id = game_id_from_conn(conn)

    {:ok, fsm} = Server.get_fsm(game_id)

    assert fsm.state == :waiting_opponent
  end
end
