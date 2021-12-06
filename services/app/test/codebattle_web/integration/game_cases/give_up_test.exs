defmodule Codebattle.GameCases.GiveUpTest do
  use Codebattle.IntegrationCase

  alias Codebattle.Game.{LiveGames, Server}
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
      |> post(game_path(conn1, :create, level: "elementary", type: "withRandomPlayer"))

    game_id = game_id_from_conn(conn)

    game_topic = "game:" <> to_string(game_id)
    {:ok, _response, socket1} = subscribe_and_join(socket1, GameChannel, game_topic)

    # Second player join game
    post(conn2, game_path(conn2, :join, game_id))
    {:ok, _response, _socket2} = subscribe_and_join(socket2, GameChannel, game_topic)

    # First player give_up
    Phoenix.ChannelTest.push(socket1, "give_up", %{})
    :timer.sleep(70)
    game = Game.Context.get_game(game_id)

    assert game.state == "game_over"
    assert Helpers.gave_up?(game, user1.id) == true
    assert Helpers.winner?(game, user2.id) == true
    assert LiveGames.game_exists?(game_id) == false
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
    conn =
      conn1
      |> get(user_path(conn1, :index))
      |> post(game_path(conn1, :create, level: "elementary", type: "withRandomPlayer"))

    game_id = game_id_from_conn(conn)

    game_topic = "game:" <> to_string(game_id)
    {:ok, _response, socket1} = subscribe_and_join(socket1, GameChannel, game_topic)

    # Second player join game
    post(conn2, game_path(conn2, :join, game_id))
    {:ok, _response, _socket2} = subscribe_and_join(socket2, GameChannel, game_topic)

    # First player give_up
    Phoenix.ChannelTest.push(socket1, "check_result", %{editor_text: "won", lang_slug: "js"})
    Phoenix.ChannelTest.push(socket1, "give_up", %{})
    :timer.sleep(70)
    game = Game.Context.get_game(game_id)

    assert game.state == "game_over"
    assert Helpers.winner?(game, user1.id) == true
    assert Helpers.lost?(game, user2.id) == true
  end

  test "After give_up user can create games", %{conn1: conn1, conn2: conn2, socket1: socket1} do
    conn =
      conn1
      |> get(Routes.page_path(conn1, :index))
      |> post(Routes.game_path(conn1, :create, level: "elementary", type: "withRandomPlayer"))

    game_id = game_id_from_conn(conn)

    game_topic = "game:" <> to_string(game_id)
    {:ok, _response, socket1} = subscribe_and_join(socket1, GameChannel, game_topic)

    conn2
    |> get(game_path(conn2, :show, game_id))
    |> follow_button("Join")

    Phoenix.ChannelTest.push(socket1, "give_up", %{})

    :timer.sleep(100)

    game = Game.Context.get_game(game_id)

    assert game.state == "game_over"

    conn =
      conn1
      |> get(Routes.page_path(conn1, :index))
      |> post(Routes.game_path(conn, :create, level: "elementary", type: "withRandomPlayer"))

    game_id = game_id_from_conn(conn)

    game = Game.Context.get_game(game.id)

    assert game.state == "waiting_opponent"
  end
end
