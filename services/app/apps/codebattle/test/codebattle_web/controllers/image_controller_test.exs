defmodule CodebattleWeb.ImageControllerTest do
  use CodebattleWeb.ConnCase, async: true

  alias Codebattle.Game.Player

  test "returns 200 with two players", %{conn: conn} do
    user1 = insert(:user)
    user2 = insert(:user)
    players = [Player.build(user1), Player.build(user2)]

    game = insert(:game, level: "elementary", state: "playing", players: players)

    conn = get(conn, Routes.game_image_path(conn, :show, game.id))

    assert conn.status == 200
    assert conn.resp_body =~ user1.name
    assert conn.resp_body =~ user2.name
    assert conn.resp_body =~ game.state
  end

  test "returns 200 with one player", %{conn: conn} do
    user1 = insert(:user)
    players = [Player.build(user1)]

    game = insert(:game, level: "elementary", state: "waiting_opponent", players: players)

    conn = get(conn, Routes.game_image_path(conn, :show, game.id))

    assert conn.status == 200
    assert conn.resp_body =~ user1.name
    assert conn.resp_body =~ game.state
  end

  test "returns 200 without players", %{conn: conn} do
    game = insert(:game, level: "elementary", state: "init", players: [])

    conn = get(conn, Routes.game_image_path(conn, :show, game.id))

    assert conn.status == 200
  end

  test "returns empty 200 without a game", %{conn: conn} do
    response =
      conn
      |> get(Routes.game_image_path(conn, :show, 1_000_001))
      |> response(200)

    assert response == ""
  end
end
