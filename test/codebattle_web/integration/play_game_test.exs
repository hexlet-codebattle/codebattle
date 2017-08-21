defmodule Codebattle.PlayGameTest do
  use Codebattle.IntegrationCase, async: true

  setup do
    user1 = insert(:user, %{name: "first", email: "test1@test.test", github_id: 1, raiting: 10})
    user2 = insert(:user, %{name: "second", email: "test1@test.test", github_id: 1, raiting: 10})
    user1_conn = assign(build_conn(), :user, user1)
    user2_conn = assign(build_conn(), :user, user2)

    {:ok, %{user1_conn: user1_conn, user2_conn: user2_conn, user1: user1, user2: user2}}
  end

  test "Two users play game", %{user1_conn: user1_conn, user2_conn: user2_conn, user1: user1, user2: user2} do

    # Create game
    conn = post(user1_conn, game_path(user1_conn, :create))

    game_location = conn.resp_headers
                    |> Enum.find(&match?({"location", _}, &1))
                    |> elem(1)

    game_id = ~r/\d+/ |> Regex.run(game_location) |> List.first |> String.to_integer
    fsm = Play.Server.fsm(game_id)

    assert get_flash(conn, :info) == "Game has been created"
    assert fsm.state == :waiting_opponent
    assert fsm.data.first_player.name == "first"
    assert fsm.data.second_player == nil
    assert fsm.data.winner == nil
    assert fsm.data.loser == nil
    assert fsm.data.game_over == false

    # Second player join game
    conn = post(user2_conn, game_location <> "/join")
    fsm = Play.Server.fsm(game_id)

    assert get_flash(conn, :info) == "Joined to game"
    assert fsm.state == :playing
    assert fsm.data.first_player.name == "first"
    assert fsm.data.second_player.name == "second"
    assert fsm.data.winner == nil
    assert fsm.data.loser == nil
    assert fsm.data.game_over == false

    # First player won
    conn = post(user1_conn, game_location <> "/check")
    fsm = Play.Server.fsm(game_id)

    assert get_flash(conn, :info) == "Yay, you won the game!"
    assert fsm.state == :player_won
    assert fsm.data.first_player.name == "first"
    assert fsm.data.second_player.name == "second"
    assert fsm.data.winner.name == "first"
    assert fsm.data.loser == nil
    assert fsm.data.game_over == false

    # Second player complete game
    conn = post(user2_conn, game_location <> "/check")

    game = Repo.get Game, game_id
    user1 = Repo.get(User, user1.id)
    user2 = Repo.get(User, user2.id)

    assert get_flash(conn, :info) == "You lose the game"
    assert game.state == "game_over"
    assert user1.raiting == 11
    assert user2.raiting == 9
  end
end
