defmodule Codebattleweb.GameControllerTest do
  use CodebattleWeb.ConnCase, async: true

  import CodebattleWeb.GameController
  alias Codebattle.Play

  test "GET /games", %{conn: conn} do
    user = insert(:user)
    conn = assign(conn, :user, user)

    conn = get conn, "/games"
    assert html_response(conn, 200) =~ "Create game"
  end

  test "GET /users", %{conn: conn} do
    user = insert(:user)
    conn = assign(conn, :user, user)

    conn = get conn, "/users"
    assert html_response(conn, 200) =~ "Users raiting"
  end

  test "POST /games/:id/join", %{conn: conn} do
    user = insert(:user)
    game_id = Play.create_game(user)

    user2 = insert(:user)
    user_conn2 = assign(conn, :user, user2)
    conn = post user_conn2, "/games/#{game_id}/join"

    assert get_flash(conn, :info) == "Joined to game"
    assert conn.state == :sent
    assert conn.status == 302
    assert redirected_to(conn) == "/games/#{game_id}"

  end

  test "POST /games/:id/check", %{conn: conn} do
    user = insert(:user)
    game_id = Play.create_game(user)


    user2 = insert(:user)
    user_conn2 = assign(conn, :user, user2)
    conn = post user_conn2, "/games/#{game_id}/join"
    conn = post user_conn2, "/games/#{game_id}/check"
    assert get_flash(conn, :info) == "Yay, you won the game!"
    assert conn.state == :sent
    assert conn.status == 302

    # conn = post user_conn, "/games/#{game_id}/join"
    # conn = post user_conn, "/games/#{game_id}/check"
    # assert get_flash(conn, :info) == "You lose the game"
    # assert conn.state == :sent
    # assert conn.status == 302
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

  test "POST /games/:id/check return 404 when game over", %{conn: conn} do
    user = insert(:user)
    conn = assign(conn, :user, user)
    game = insert(:game, state: "game_over")

    conn = post conn, "/games/#{game.id}/check"
    assert conn.status == 404
  end
end
