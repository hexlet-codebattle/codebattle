defmodule CodebattleWeb.LobbyChannelTest do
  use CodebattleWeb.ChannelCase

  alias CodebattleWeb.LobbyChannel
  alias CodebattleWeb.UserSocket
  alias Codebattle.GameProcess.Player

  test "sends game info when user join" do
    task = insert(:task)
    game = insert(:game, task: task, level: task.level, state: "game_over")
    insert(:tournament, %{state: "active"})
    user = insert(:user)
    insert(:user_game, user: user, creator: false, game: game, result: "won")
    insert(:user_game, user: user, creator: true, game: game, result: "gave_up")

    user_token = Phoenix.Token.sign(socket(UserSocket), "user_token", user.id)
    {:ok, socket} = connect(UserSocket, %{"token" => user_token})

    {:ok, %{winner: user, socket: socket, task: task}}
    state = :waiting_opponent

    data = %{
      players: [%Player{id: user.id}],
      task: task
    }

    setup_game(state, data)

    {:ok,
     %{
       active_games: active_games,
       live_tournaments: live_tournaments,
       completed_games: completed_games
     }, _socket} = subscribe_and_join(socket, LobbyChannel, "lobby")

    assert active_games
    assert live_tournaments
    assert completed_games
  end

  test "creates game" do
    user = insert(:user)
    user_token = Phoenix.Token.sign(socket(UserSocket), "user_token", user.id)
    {:ok, socket} = connect(UserSocket, %{"token" => user_token})

    {:ok, _payload, socket} = subscribe_and_join(socket, LobbyChannel, "lobby")

    push(socket, "game:create", %{type: "withRandomPlayer", level: "elementary"})

    assert_receive %Phoenix.Socket.Broadcast{
      event: "game:upsert"
    }
  end
end
