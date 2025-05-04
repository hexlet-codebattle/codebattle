defmodule CodebattleWeb.Integration.Game.StandardGameTest do
  use Codebattle.IntegrationCase

  setup %{conn: conn} do
    insert(:task, level: "easy")
    user1 = insert(:user, %{name: "first", email: "test1@test.test", github_id: 1, rating: 1000})
    user2 = insert(:user, %{name: "second", email: "test2@test.test", github_id: 2, rating: 1000})

    conn2 = put_session(conn, :user_id, user2.id)

    socket1 = socket(UserSocket, "user_id", %{user_id: user1.id, current_user: user1})
    socket2 = socket(UserSocket, "user_id", %{user_id: user2.id, current_user: user2})

    {:ok,
     %{
       conn2: conn2,
       socket1: socket1,
       socket2: socket2,
       user1: user1,
       user2: user2
     }}
  end

  test "Two users play game checker v2", %{
    conn2: conn2,
    socket1: socket1,
    socket2: socket2,
    user2: user2
  } do
    # Create game

    {:ok, _response, socket1} = subscribe_and_join(socket1, LobbyChannel, "lobby")

    ref = Phoenix.ChannelTest.push(socket1, "game:create", %{level: "easy"})
    Phoenix.ChannelTest.assert_reply(ref, :ok, %{game_id: game_id})

    game_topic = "game:" <> to_string(game_id)
    {:ok, _response, socket1} = subscribe_and_join(socket1, GameChannel, game_topic)

    game = Game.Context.get_game!(game_id)

    assert game.state == "waiting_opponent"
    assert Game.Helpers.get_first_player(game).name == "first"
    assert Game.Helpers.get_second_player(game) == nil

    # Second player join game
    post(conn2, game_path(conn2, :join, game_id))
    {:ok, _response, _socket} = subscribe_and_join(socket2, GameChannel, game_topic)
    game = Game.Context.get_game!(game_id)

    assert game.state == "playing"
    assert Helpers.get_first_player(game).name == "first"
    assert Helpers.get_second_player(game).name == "second"

    # report_works
    Phoenix.ChannelTest.push(socket1, "game:report", %{player_id: user2.id})

    assert_receive(
      %{payload: %{report: %{id: _, inserted_at: _}}},
      5000
    )

    # can't report twice
    Phoenix.ChannelTest.push(socket1, "game:report", %{player_id: user2.id})

    assert_receive(
      %{payload: %{reason: :already_have_report}},
      5000
    )
  end
end
