defmodule Codebattle.PlayGameTest do
  use Codebattle.IntegrationCase

  import Mock

  alias Codebattle.GameProcess.Server

  setup %{conn: conn} do
    insert(:task)
    user1 = insert(:user, %{name: "first", email: "test1@test.test", github_id: 1, rating: 1000})
    user2 = insert(:user, %{name: "second", email: "test2@test.test", github_id: 2, rating: 1000})
    user3 = insert(:user, %{name: "other", email: "test3@test.test", github_id: 3, rating: 1000})

    conn1 = put_session(conn, :user_id, user1.id)
    conn2 = put_session(conn, :user_id, user2.id)
    conn3 = put_session(conn, :user_id, user3.id)

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
      conn = conn1
            |> get(page_path(conn1, :index))
            |> post(game_path(conn1, :create))
      game_id = game_id_from_conn(conn)

      game_topic = "game:" <> to_string(game_id)
      {:ok, _response, socket1} = subscribe_and_join(socket1, GameChannel, game_topic)

      fsm = Server.fsm(game_id)

      assert fsm.state == :waiting_opponent
      assert FsmHelpers.get_first_player(fsm).user.name == "first"
      assert FsmHelpers.get_second_player(fsm).user == %User{}

      # First player cannot join to game as second player
      post(conn1, game_path(conn1, :join, game_id))
      fsm = Server.fsm(game_id)

      assert fsm.state == :waiting_opponent
      assert FsmHelpers.get_first_player(fsm).user.name == "first"
      assert FsmHelpers.get_second_player(fsm).user == %User{}

      # Second player join game
      post(conn2, game_path(conn2, :join, game_id))
      {:ok, _response, socket2} = subscribe_and_join(socket2, GameChannel, game_topic)
      fsm = Server.fsm(game_id)

      assert fsm.state == :playing
      assert FsmHelpers.get_first_player(fsm).user.name == "first"
      assert FsmHelpers.get_second_player(fsm).user.name == "second"
      assert FsmHelpers.get_first_player(fsm).editor_text == ""
      assert FsmHelpers.get_second_player(fsm).editor_text == ""

      # First player won
      editor_text1 = "Hello world1!"
      editor_text2 = "Hello world2!"
      editor_text3 = "Hello world3!"

      push socket1, "check_result", %{editor_text: editor_text1, lang: :js}
      :timer.sleep(100)
      fsm = Server.fsm(game_id)

      assert fsm.state == :game_over
      assert FsmHelpers.get_first_player(fsm).user.name == "first"
      assert FsmHelpers.get_second_player(fsm).user.name == "second"
      assert FsmHelpers.get_winner(fsm).name == "first"
      assert FsmHelpers.get_first_player(fsm).editor_text == "Hello world1!"
      assert FsmHelpers.get_second_player(fsm).editor_text == ""

      # Winner cannot check results again
      push socket1, "check_result", %{editor_text: editor_text2, lang: :js}
      :timer.sleep(100)
      fsm = Server.fsm(game_id)

      assert fsm.state == :game_over
      assert FsmHelpers.get_first_player(fsm).user.name == "first"
      assert FsmHelpers.get_second_player(fsm).user.name == "second"
      assert FsmHelpers.get_winner(fsm).name == "first"
      assert FsmHelpers.get_first_player(fsm).editor_text == "Hello world2!"
      assert FsmHelpers.get_second_player(fsm).editor_text == ""

      # Second player complete game
      push socket2, "check_result", %{editor_text: editor_text3, lang: :js}
      :timer.sleep(100)

      game = Repo.get Game, game_id
      user1 = Repo.get(User, user1.id)
      user2 = Repo.get(User, user2.id)

      assert game.state == "game_over"
      assert user1.rating == 1012
      assert user2.rating == 988
    end
  end

  test "other players cannot change game state", %{conn1: conn1, conn2: conn2, conn3: conn3, socket3: socket3} do
    # Create game
    conn1 = conn1
           |> get(page_path(conn1, :index))
           |> post(game_path(conn1, :create))
    game_id = game_id_from_conn(conn1)

    game_topic = "game:" <> to_string(game_id)

    post(conn2, game_path(conn2, :join, game_id))

    # Other player cannot join game
    post(conn3, game_path(conn3, :join, game_id))
    fsm = Server.fsm(game_id)

    assert fsm.state == :playing
    assert FsmHelpers.get_first_player(fsm).user.name == "first"
    assert FsmHelpers.get_second_player(fsm).user.name == "second"

    # Other player cannot win game
    {:ok, _response, socket3} = subscribe_and_join(socket3, GameChannel, game_topic)
    push socket3, "check_result", %{editor_text: "Hello world!", lang: :js}
    fsm = Server.fsm(game_id)

    assert fsm.state == :playing
    assert FsmHelpers.get_first_player(fsm).user.name == "first"
    assert FsmHelpers.get_second_player(fsm).user.name == "second"
  end
end
