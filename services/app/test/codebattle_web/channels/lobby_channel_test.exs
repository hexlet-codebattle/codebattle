defmodule CodebattleWeb.LobbyChannelTest do
  use CodebattleWeb.ChannelCase

  alias CodebattleWeb.LobbyChannel
  alias CodebattleWeb.UserSocket
  alias Codebattle.GameProcess.Player

  setup do
    task = insert(:task)
    game = insert(:game, task: task, level: task.level, state: "game_over")
    winner = insert(:user)
    loser = insert(:user)

    _winner_user_game =
      insert(:user_game, user: winner, creator: false, game: game, result: "won")

    _loser_user_game =
      insert(:user_game, user: loser, creator: true, game: game, result: "gave_up")

    user_token1 = Phoenix.Token.sign(socket(UserSocket), "user_token", winner.id)
    {:ok, socket1} = connect(UserSocket, %{"token" => user_token1})

    {:ok, %{winner: winner, socket1: socket1, task: task}}
  end

  test "sends game info when user join", %{winner: winner, socket1: socket1, task: task} do
    state = :waiting_opponent

    data = %{
      players: [%Player{id: winner.id}],
      task: task
    }

    setup_game(state, data)

    {:ok, %{active_games: active_games, completed_games: completed_games}, _socket1} =
      subscribe_and_join(socket1, LobbyChannel, "lobby")

    # TODO: fix test active games

    assert length(active_games) >= 1
    assert length(completed_games) == 1
  end
end
