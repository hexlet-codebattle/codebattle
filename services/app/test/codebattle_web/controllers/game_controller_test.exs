defmodule Codebattleweb.GameControllerTest do
  use CodebattleWeb.ConnCase, async: false

  import Ecto.Query, warn: false
  alias Codebattle.{Repo, Game}
  alias Codebattle.Game.{ActiveGames, Server}

  test "return 404 when game over does not exists", %{conn: conn} do
    user = insert(:user)

    conn =
      conn
      |> put_session(:user_id, user.id)
      |> get(Routes.game_path(conn, :show, 1_231_223))

    assert conn.status == 404
  end

  test "return 200 when game is not active", %{conn: conn} do
    user = insert(:user)
    game = insert(:game, state: "game_over")

    conn =
      conn
      |> put_session(:user_id, user.id)
      |> get(Routes.game_path(conn, :show, game.id))

    assert conn.status == 200
  end

  test "show game_over html", %{conn: conn} do
    user1 = build(:user)
    user2 = build(:user)
    state = :game_over

    data = %{
      players: [
        Player.build(user1, %{game_result: :won}),
        Player.build(user2, %{game_result: :lost})
      ]
    }

    game = setup_game(state, data)

    conn =
      conn
      |> put_session(:user_id, user1.id)
      |> get(Routes.game_path(conn, :show, game.id))

    assert conn.status == 200
  end

  test "cancel game", %{conn: conn} do
    user1 = insert(:user)

    conn1 =
      create_game(
        conn,
        user1,
        %{"type" => "withRandomPlayer", "level" => "elementary"}
      )

    %{id: created_game_id} = redirected_params(conn1)

    game_id = String.to_integer(created_game_id)

    assert ActiveGames.game_exists?(game_id) == true

    conn =
      conn
      |> put_session(:user_id, user1.id)
      |> delete(Routes.game_path(conn, :delete, game_id))

    assert conn.status == 302

    game = from(g in Game) |> Repo.get(game_id)

    assert game.state == "canceled"
    assert ActiveGames.game_exists?(game.id) == false
    assert Server.game_pid(game.id) == :undefined
  end

  test "create game", %{conn: conn} do
    user = insert(:user)

    conn =
      create_game(
        conn,
        user,
        %{"type" => "withRandomPlayer", "level" => "elementary"}
      )

    assert conn.status == 302
    assert %{id: created_game_id} = redirected_params(conn)

    id = String.to_integer(created_game_id)

    game = active_game(id)

    assert game.players |> Enum.count() == 1
    assert game.timeout_seconds == 3600
    assert game.type == "public"
    assert game.level == "elementary"
  end

  test "create private game with timeout", %{conn: conn} do
    user = insert(:user)

    conn =
      create_game(
        conn,
        user,
        %{"type" => "withFriend", "level" => "medium", "timeout_seconds" => "60"}
      )

    assert conn.status == 302
    assert %{id: created_game_id} = redirected_params(conn)
    id = String.to_integer(created_game_id)

    game = active_game(id)

    assert game.players |> Enum.count() == 1
    assert game.timeout_seconds == 60
    assert game.type == "private"
    assert game.level == "medium"
  end

  test "create game and normalizes incorrect timeout and type values", %{conn: conn} do
    user = insert(:user)

    conn =
      create_game(
        conn,
        user,
        %{"type" => "a", "level" => "medium", "timeout_seconds" => "8"}
      )

    assert conn.status == 302
    assert get_flash(conn, :danger) != nil
    assert ActiveGames.get_games() == []
  end

  defp create_game(conn, user, params) do
    conn
    |> put_session(:user_id, user.id)
    |> post(Routes.game_path(conn, :create, params))
  end

  defp active_game(id) do
    ActiveGames.get_games()
    |> Enum.find(fn %{id: game_id} -> game_id == id end)
  end
end
