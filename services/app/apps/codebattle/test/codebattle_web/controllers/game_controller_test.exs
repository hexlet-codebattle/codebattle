defmodule Codebattleweb.GameControllerTest do
  use CodebattleWeb.ConnCase, async: false

  import Ecto.Query, warn: false
  alias Codebattle.Game

  describe "GET games/:id" do
    test "shows live waiting_opponent game", %{conn: conn} do
      users = build_list(1, :user)
      task = build(:task)

      {:ok, game} =
        Game.Context.create_game(%{state: "waiting_opponent", players: users, task: task})

      conn
      |> get(Routes.game_path(conn, :show, game.id))
      |> html_response(200)
    end

    test "shows live playing game", %{conn: conn} do
      users = build_list(2, :user)
      task = build(:task)
      {:ok, game} = Game.Context.create_game(%{state: "playing", players: users, task: task})

      conn
      |> get(Routes.game_path(conn, :show, game.id))
      |> html_response(200)
    end

    test "shows live game_over game", %{conn: conn} do
      users = build_list(2, :user)
      task = build(:task)
      {:ok, game} = Game.Context.create_game(%{state: "game_over", players: users, task: task})

      conn
      |> get(Routes.game_path(conn, :show, game.id))
      |> html_response(200)
    end

    test "return 200 when game is not live", %{conn: conn} do
      users = build_list(2, :user)
      task = build(:task)
      {:ok, game} = Game.Context.create_game(%{state: "game_over", players: users, task: task})
      Game.Context.terminate_game(game)

      conn
      |> get(Routes.game_path(conn, :show, game.id))
      |> html_response(200)
    end

    test "return 404 when game over does not exists", %{conn: conn} do
      assert_error_sent(:not_found, fn ->
        get(conn, Routes.game_path(conn, :show, 1_231_223))
      end)
    end
  end

  describe "DELETE /games/:id" do
    test "cancels game", %{conn: conn} do
      [user1 | _] = users = insert_list(1, :user)
      task = build(:task)

      {:ok, game} =
        Game.Context.create_game(%{state: "waiting_opponent", players: users, task: task})

      conn
      |> put_session(:user_id, user1.id)
      |> delete(Routes.game_path(conn, :delete, game.id))
      |> html_response(302)

      updated = Game.Context.get_game!(game.id)
      assert updated.is_live == false
      assert updated.state == "canceled"
    end
  end

  describe "POST /games/:id/join" do
    test "joins game", %{conn: conn} do
      task = insert(:task, level: "elementary")

      [user1, user2] = insert_list(2, :user)

      {:ok, game} =
        Game.Context.create_game(%{state: "waiting_opponent", players: [user1], task: task})

      conn
      |> put_session(:user_id, user2.id)
      |> post(Routes.game_path(conn, :join, game.id))
      |> html_response(302)

      updated = Game.Context.get_game!(game.id)
      user1_id = user1.id
      user2_id = user2.id
      assert updated.is_live == true
      assert updated.state == "playing"
      assert [%{id: ^user1_id}, %{id: ^user2_id}] = updated.players
    end
  end

  describe "POST /games/training" do
    test "creates training game", %{conn: conn} do
      insert(:task, level: "elementary")

      conn
      |> post(Routes.game_path(conn, :create_training))
      |> html_response(302)
    end
  end
end
