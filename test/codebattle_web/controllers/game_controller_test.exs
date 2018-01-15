defmodule Codebattleweb.GameControllerTest do
  use CodebattleWeb.ConnCase, async: true

  test "show return 404 when game over", %{conn: conn} do
    user = insert(:user)
    game = insert(:game, state: "game_over")

    conn = conn
           |> put_session(:user_id, user.id)
           |> get(game_path(conn, :show, game.id))
    assert conn.status == 404
  end

  test "join return 404 when game over", %{conn: conn} do
    user = insert(:user)
    game = insert(:game, state: "game_over")
    conn = conn
           |> put_session(:user_id, user.id)
           |> post(game_path(conn, :join, game.id))
    assert conn.status == 404
  end
end
