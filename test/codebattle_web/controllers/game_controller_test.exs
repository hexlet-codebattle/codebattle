defmodule Codebattleweb.GameControllerTest do
  use CodebattleWeb.ConnCase, async: true

  test "GET /users", %{conn: conn} do
    user = insert(:user)
    conn = assign(conn, :user, user)

    conn = get conn, "/users"
    assert html_response(conn, 200) =~ "Users rating"
  end

  test "GET /games/:id return 404 when game over", %{conn: conn} do
    user = insert(:user)
    conn = assign(conn, :user, user)
    game = insert(:game, state: "game_over")

    conn = get conn, "/games/#{game.id}"
    assert conn.status == 404
  end

  test "POST /games/:id/join return 404 when game over", %{conn: conn} do
    user = insert(:user)
    conn = assign(conn, :user, user)
    game = insert(:game, state: "game_over")

    conn = post conn, "/games/#{game.id}/join"
    assert conn.status == 404
  end
end
