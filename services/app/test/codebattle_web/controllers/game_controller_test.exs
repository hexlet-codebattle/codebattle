defmodule Codebattleweb.GameControllerTest do
  use CodebattleWeb.ConnCase, async: true

  test "return 404 when game over does not exists", %{conn: conn} do
    user = insert(:user)

    conn =
      conn
      |> put_session(:user_id, user.id)
      |> get(game_path(conn, :show, 1_231_223))

    assert conn.status == 404
  end

  test "return 200 when game is not active", %{conn: conn} do
    user = insert(:user)
    game = insert(:game, state: "game_over")

    conn =
      conn
      |> put_session(:user_id, user.id)
      |> get(game_path(conn, :show, game.id))

    assert conn.status == 200
  end

  test "show game_over html", %{conn: conn} do
    user1 = build(:user)
    user2 = build(:user)
    state = :game_over

    data = %{
      players: [
        Player.from_user(user1, game_result: :won)
        Player.from_user(user2, game_result: :lost)
      ]
    }

    game = setup_game(state, data)

    conn =
      conn
      |> put_session(:user_id, user1.id)
      |> get(game_path(conn, :show, game.id))

    assert conn.status == 200
  end

  test "cancel game", %{conn: conn} do
    user1 = build(:user)
    user2 = build(:user)
    state = :game_over

    data = %{
      players: [
        %Player{id: user1.id, user: user1, game_result: :won},
        %Player{id: user2.id, user: user2, game_result: :lost}
      ]
    }

    game = setup_game(state, data)

    conn =
      conn
      |> put_session(:user_id, user1.id)
      |> delete(game_path(conn, :delete, game.id))

    assert conn.status == 302
  end
end
