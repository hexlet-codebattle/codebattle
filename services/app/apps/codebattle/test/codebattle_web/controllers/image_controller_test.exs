defmodule CodebattleWeb.ImageControllerTest do
  use CodebattleWeb.ConnCase, async: true

  alias Codebattle.Game.Player

  test "returns 200 with two players", %{conn: conn} do
    user1 = insert(:user)
    user2 = insert(:user)
    players = [Player.build(user1), Player.build(user2)]

    game = insert(:game, level: "elementary", state: "playing", players: players)

    conn =
      conn
      |> get(Routes.game_image_path(conn, :show, game.id))

    assert conn.status == 200
    assert conn.resp_body =~ user1.name
    assert conn.resp_body =~ user2.name
    assert conn.resp_body =~ game.state
  end

  test "returns 200 with one player", %{conn: conn} do
    user1 = insert(:user)
    players = [Player.build(user1)]

    game = insert(:game, level: "elementary", state: "waiting_opponent", players: players)

    conn =
      conn
      |> get(Routes.game_image_path(conn, :show, game.id))

    assert conn.status == 200
    assert conn.resp_body =~ user1.name
    assert conn.resp_body =~ game.state
  end

  test "returns 200 without players", %{conn: conn} do
    game = insert(:game, level: "elementary", state: "init", players: [])

    conn =
      conn
      |> get(Routes.game_image_path(conn, :show, game.id))

    assert conn.status == 200
    assert conn.resp_body =~ "game"
  end

  test "returns 404 withot game", %{conn: conn} do
    response =
      conn
      |> get(Routes.game_image_path(conn, :show, 1_000_001))
      |> json_response(404)

    assert response == %{"error" => ":not_found"}
  end
end
