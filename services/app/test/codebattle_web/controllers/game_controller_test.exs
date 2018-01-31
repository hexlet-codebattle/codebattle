defmodule Codebattleweb.GameControllerTest do
  use CodebattleWeb.ConnCase, async: true

  test "show return 404 when game over", %{conn: conn} do
    user = insert(:user)
    game = insert(:game, state: "game_over")

    conn =
      conn
      |> put_session(:user_id, user.id)
      |> get(game_path(conn, :show, game.id))

    assert conn.status == 404
  end

  test "join return 404 when game over", %{conn: conn} do
    user = insert(:user)
    game = insert(:game, state: "game_over")

    conn =
      conn
      |> put_session(:user_id, user.id)
      |> post(game_path(conn, :join, game.id))

    assert conn.status == 404
  end

  test "show game_over html", %{conn: conn} do
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
      |> get(game_path(conn, :show, game.id))

    assert conn.status == 200
  end
end
