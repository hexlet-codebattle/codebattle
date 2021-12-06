defmodule CodebattleWeb.LobbyChannelTest do
  use CodebattleWeb.ChannelCase

  alias CodebattleWeb.LobbyChannel
  alias CodebattleWeb.UserSocket
  alias Codebattle.Game

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

    game_params = %{state: "waiting_opponent", players: [%Game.Player{id: user.id}], task: task}
    {:ok, game} = Game.Context.create_game(game_params)
    game_topic = "game:" <> to_string(game.id)

    {:ok,
     %{
       live_games: live_games,
       tournaments: tournaments,
       completed_games: completed_games
     }, _socket} = subscribe_and_join(socket, LobbyChannel, "lobby")

    assert live_games
    assert tournaments
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
