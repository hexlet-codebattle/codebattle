defmodule Codebattleweb.GameControllerTest do
  use CodebattleWeb.ConnCase, async: false

  import Ecto.Query, warn: false
  alias Codebattle.{Repo, Game}
  alias Codebattle.GameProcess.{ActiveGames, Server}

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
    state = :waiting_opponent

    data = %{
      players: [
        Player.build(user1, %{game_result: :undefined})
      ]
    }

    game = setup_game(state, data)
    assert ActiveGames.game_exists?(game.id) == true

    conn =
      conn
      |> put_session(:user_id, user1.id)
      |> delete(Routes.game_path(conn, :delete, game.id))

    assert conn.status == 302

    game = from(g in Game) |> Repo.get(game.id)

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
        %{"type" => "public", "level" => "elementary"}
      )

    assert conn.status == 302
    assert %{id: created_game_id} = redirected_params(conn)

    id = String.to_integer(created_game_id)

    {_, users, game_info} = active_game(id)

    assert users[user.id] != nil
    assert game_info[:timeout_seconds] == 0
    assert game_info[:type] == "public"
    assert game_info[:level] == "elementary"
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

    {_, users, game_info} = active_game(id)

    assert users[user.id] != nil
    assert game_info[:timeout_seconds] == 60
    assert game_info[:type] == "private"
    assert game_info[:level] == "medium"
  end

  test "create game and normalizes incorrect timeout and type values", %{conn: conn} do
    user = insert(:user)

    conn =
      create_game(
        conn,
        user,
        %{"type" => "wrongType", "level" => "medium", "timeout_seconds" => "8"}
      )

    assert conn.status == 302
    assert %{id: created_game_id} = redirected_params(conn)

    id = String.to_integer(created_game_id)

    {_, users, game_info} = active_game(id)

    assert users[user.id] != nil
    assert game_info[:timeout_seconds] == 0
    assert game_info[:type] == "public"
    assert game_info[:level] == "medium"
  end

  defp create_game(conn, user, params) do
    conn
    |> put_session(:user_id, user.id)
    |> post(Routes.game_path(conn, :create, params))
  end

  defp active_game(id) do
    ActiveGames.list_games()
    |> Enum.find(fn {game_id, _, _} -> game_id == id end)
  end
end
