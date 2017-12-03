defmodule Codebattle.PlayGameTest do
  use Codebattle.IntegrationCase

  import Mock

  alias Codebattle.GameProcess.Server
  alias CodebattleWeb.GameChannel

  setup do
    insert(:task)
    user1 = insert(:user, %{name: "first", email: "test1@test.test", github_id: 1, raiting: 10})
    user2 = insert(:user, %{name: "second", email: "test2@test.test", github_id: 2, raiting: 10})
    user3 = insert(:user, %{name: "other", email: "test3@test.test", github_id: 3, raiting: 10})
    conn1 = assign(build_conn(), :user, user1)
    conn2 = assign(build_conn(), :user, user2)
    conn3 = assign(build_conn(), :user, user3)

    socket1 = socket("user_id", %{user_id: user1.id, current_user: user1})
    socket2 = socket("user_id", %{user_id: user2.id, current_user: user2})
    socket3 = socket("user_id", %{user_id: user3.id, current_user: user3})
    {:ok, %{conn1: conn1, conn2: conn2, conn3: conn3,
            socket1: socket1, socket2: socket2, socket3: socket3,
            user1: user1, user2: user2, user3: user3}}
  end

  test "Two users play game", %{conn1: conn1, conn2: conn2, socket1: socket1,
                                socket2: socket2, user1: user1, user2: user2} do
    with_mocks([{Codebattle.CodeCheck.Checker, [], [check: fn(_a, _b, _c) -> {:ok, true} end]}]) do

      # Create game
      conn = post(conn1, game_path(conn1, :create))

      game_location = conn.resp_headers
                      |> Enum.find(&match?({"location", _}, &1))
                      |> elem(1)

      game_id = ~r/\d+/ |> Regex.run(game_location) |> List.first |> String.to_integer
      game_topic = "game:" <> to_string(game_id)
      {:ok, _response, socket1} = subscribe_and_join(socket1, GameChannel, game_topic)

      fsm = Server.fsm(game_id)

      assert fsm.state == :waiting_opponent
      assert fsm.data.first_player.name == "first"
      assert fsm.data.second_player == %User{}
      assert fsm.data.winner == %User{}
      assert fsm.data.loser == %User{}
      assert fsm.data.game_over == false

      # First player cannot join to game as second player
      post(conn1, game_location <> "/join")
      fsm = Server.fsm(game_id)

      assert fsm.state == :waiting_opponent
      assert fsm.data.first_player.name == "first"
      assert fsm.data.second_player == %User{}
      assert fsm.data.winner == %User{}
      assert fsm.data.loser == %User{}
      assert fsm.data.game_over == false

      # Second player join game
      post(conn2, game_location <> "/join")
      {:ok, _response, socket2} = subscribe_and_join(socket2, GameChannel, game_topic)
      fsm = Server.fsm(game_id)

      assert fsm.state == :playing
      assert fsm.data.first_player.name == "first"
      assert fsm.data.second_player.name == "second"
      assert fsm.data.winner == %User{}
      assert fsm.data.loser == %User{}
      assert fsm.data.game_over == false
      assert fsm.data.first_player_editor_text == " "
      assert fsm.data.second_player_editor_text == " "

      # First player won
      editor_text1 = "Hello world1!"
      editor_text2 = "Hello world2!"
      editor_text3 = "Hello world3!"

      push socket1, "check_result", %{editor_text: editor_text1}
      :timer.sleep(100)
      fsm = Server.fsm(game_id)

      assert fsm.state == :player_won
      assert fsm.data.first_player.name == "first"
      assert fsm.data.second_player.name == "second"
      assert fsm.data.winner.name == "first"
      assert fsm.data.loser == %User{}
      assert fsm.data.game_over == false
      assert fsm.data.first_player_editor_text == "Hello world1!"
      assert fsm.data.second_player_editor_text == " "

      # Winner cannot check results again
      push socket1, "check_result", %{editor_text: editor_text2}
      :timer.sleep(100)
      fsm = Server.fsm(game_id)

      assert fsm.state == :player_won
      assert fsm.data.first_player.name == "first"
      assert fsm.data.second_player.name == "second"
      assert fsm.data.winner.name == "first"
      assert fsm.data.loser == %User{}
      assert fsm.data.game_over == false
      assert fsm.data.first_player_editor_text == "Hello world2!"
      assert fsm.data.second_player_editor_text == " "

      # Second player complete game
      push socket2, "check_result", %{editor_text: editor_text3}
      :timer.sleep(100)

      game = Repo.get Game, game_id
      user1 = Repo.get(User, user1.id)
      user2 = Repo.get(User, user2.id)

      assert game.state == "game_over"
      assert user1.raiting == 11
      assert user2.raiting == 9
    end
  end

  test "other players cannot change game state", %{conn1: conn1, conn2: conn2, conn3: conn3, socket3: socket3} do
    conn = post(conn1, game_path(conn1, :create))
    game_location = conn.resp_headers
                    |> Enum.find(&match?({"location", _}, &1))
                    |> elem(1)
    game_id = ~r/\d+/ |> Regex.run(game_location) |> List.first |> String.to_integer
    game_topic = "game:" <> to_string(game_id)

    post(conn2, game_location <> "/join")

    # Other player cannot join game
    post(conn3, game_location <> "/join")
    fsm = Server.fsm(game_id)

    assert fsm.state == :playing
    assert fsm.data.first_player.name == "first"
    assert fsm.data.second_player.name == "second"
    assert fsm.data.winner == %User{}
    assert fsm.data.loser == %User{}
    assert fsm.data.game_over == false

    # Other player cannot win game
    {:ok, _response, socket3} = subscribe_and_join(socket3, GameChannel, game_topic)
    push socket3, "check_result", %{editor_text: "Hello world!"}
    fsm = Server.fsm(game_id)

    assert fsm.state == :playing
    assert fsm.data.first_player.name == "first"
    assert fsm.data.second_player.name == "second"
    assert fsm.data.winner == %User{}
    assert fsm.data.loser == %User{}
    assert fsm.data.game_over == false
  end
end
