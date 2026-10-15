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
  end

  test "returns 200 with one player", %{conn: conn} do
    user1 = insert(:user)
    players = [Player.build(user1)]

    game = insert(:game, level: "elementary", state: "waiting_opponent", players: players)

    conn = get(conn, Routes.game_image_path(conn, :show, game.id))

    assert conn.status == 200
    assert conn.resp_body =~ user1.name
    assert conn.resp_body =~ "Waiting for an opponent"
    assert conn.resp_body =~ "Free seat"
  end

  test "marks the winner of a finished game", %{conn: conn} do
    user1 = insert(:user)
    user2 = insert(:user)
    players = [%{Player.build(user1) | result: "won"}, %{Player.build(user2) | result: "lost"}]

    game = insert(:game, level: "easy", state: "game_over", players: players)

    conn = get(conn, Routes.game_image_path(conn, :show, game.id))

    assert conn.status == 200
    assert conn.resp_body =~ ~s(class="side winner")
    assert conn.resp_body =~ "Finished"
  end

  test "returns empty 200 without a game", %{conn: conn} do
    response =
      conn
      |> get(Routes.game_image_path(conn, :show, 1_000_001))
      |> response(200)

    assert response == ""
  end

  test "returns 200 with no players", %{conn: conn} do
    game = insert(:game, level: "elementary", state: "waiting_opponent", players: [])

    conn = get(conn, Routes.game_image_path(conn, :show, game.id))

    assert conn.status == 200
    assert conn.resp_body =~ "Waiting for an opponent"
    assert conn.resp_body =~ "Elementary"
  end

  test "renders a tournament card", %{conn: conn} do
    tournament = insert(:tournament, name: "Autumn <Cup>", state: "upcoming", level: "medium")

    conn = get(conn, Routes.tournament_image_path(conn, :show, tournament.id))

    assert conn.status == 200
    assert conn.resp_body =~ "Autumn &lt;Cup&gt;"
    assert conn.resp_body =~ "Swiss tournament"
    assert conn.resp_body =~ "Medium"
  end
end
