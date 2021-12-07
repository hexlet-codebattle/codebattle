defmodule Codebattle.GameCases.TimeoutTest do
  use Codebattle.IntegrationCase

  alias Codebattle.Game.LiveGames
  alias CodebattleWeb.UserSocket

  setup %{conn: conn} do
    insert(:task, level: "elementary")
    user1 = insert(:user)
    user2 = insert(:user)

    conn2 = put_session(conn, :user_id, user2.id)

    socket1 = socket(UserSocket, "user_id", %{user_id: user1.id, current_user: user1})
    socket2 = socket(UserSocket, "user_id", %{user_id: user2.id, current_user: user2})

    {:ok,
     %{conn2: conn2, socket1: socket1, socket2: socket2, user1: user1, user2: user2}}
  end

  test "game timed out", %{
    conn2: conn2,
    socket1: socket1,
    socket2: socket2,
    user1: _user1,
    user2: _user2
  } do
    # Create game
    {:ok, _response, socket1} = subscribe_and_join(socket1, LobbyChannel, "lobby")

    ref = Phoenix.ChannelTest.push(socket1, "game:create", %{level: "easy", timeout_seconds: 60})
    Phoenix.ChannelTest.assert_reply(ref, :ok, %{game_id: game_id})

    game_topic = "game:" <> to_string(game_id)
    {:ok, _response, _socket1} = subscribe_and_join(socket1, GameChannel, game_topic)

    # Second player join game
    post(conn2, game_path(conn2, :join, game_id))
    {:ok, _response, _socket2} = subscribe_and_join(socket2, GameChannel, game_topic)
    :timer.sleep(70)

    Codebattle.Game.Context.trigger_timeout(game_id)

    assert %{state: "timeout"} = Codebattle.Game.Context.get_game(game_id)

    assert LiveGames.game_exists?(game_id) == false
  end

  test "After timeout user can create games", %{conn2: conn2, socket1: socket1} do
    {:ok, _response, socket1} = subscribe_and_join(socket1, LobbyChannel, "lobby")

    ref = Phoenix.ChannelTest.push(socket1, "game:create", %{level: "easy"})
    Phoenix.ChannelTest.assert_reply(ref, :ok, %{game_id: game_id})

    game_topic = "game:" <> to_string(game_id)
    subscribe_and_join(socket1, GameChannel, game_topic)

    conn2
    |> get(game_path(conn2, :show, game_id))
    |> follow_button("Join")

    Codebattle.Game.Context.trigger_timeout(game_id)

    assert %{state: "timeout"} = Codebattle.Game.Context.get_game(game_id)
    {:ok, _response, socket1} = subscribe_and_join(socket1, LobbyChannel, "lobby")

    ref = Phoenix.ChannelTest.push(socket1, "game:create", %{level: "easy"})
    Phoenix.ChannelTest.assert_reply(ref, :ok, %{game_id: game_id})

    game = Game.Context.get_game(game_id)

    assert game.state == "waiting_opponent"
  end
end
