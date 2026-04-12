defmodule CodebattleWeb.GameControllerTest do
  use CodebattleWeb.ConnCase, async: false

  import Ecto.Query, warn: false
  import PhoenixGon.Controller

  alias Codebattle.Game
  alias Codebattle.Tournament.Player

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

    test "marks game payload to hide controls for tournament games when tournament excludes banned players", %{
      conn: conn
    } do
      current_user = insert(:user, name: "alice")
      opponent = insert(:user, name: "bob")
      task = insert(:task, level: "easy")

      tournament =
        insert(:tournament,
          type: "swiss",
          state: "active",
          exclude_banned_players: true
        )

      players = [
        %{
          Player.new!(%{
            id: current_user.id,
            name: current_user.name,
            lang: current_user.lang,
            avatar_url: current_user.avatar_url,
            clan_id: current_user.clan_id,
            style_lang: current_user.style_lang,
            db_type: current_user.db_type
          })
          | state: "banned"
        },
        Player.new!(%{
          id: opponent.id,
          name: opponent.name,
          lang: opponent.lang,
          avatar_url: opponent.avatar_url,
          clan_id: opponent.clan_id,
          style_lang: opponent.style_lang,
          db_type: opponent.db_type,
          state: "active"
        })
      ]

      {:ok, game} =
        Game.Context.create_game(%{
          state: "playing",
          players: players,
          task: task,
          tournament_id: tournament.id
        })

      conn =
        conn
        |> put_session(:user_id, current_user.id)
        |> get(Routes.game_path(conn, :show, game.id))

      assert html_response(conn, 200)
      assert %{hide_banned_player_controls: true} = get_gon(conn, :game)
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
      conn = get(conn, Routes.game_path(conn, :show, 1_231_223))

      assert html_response(conn, 404) =~ "Game not found"
    end

    test "return 404 when game id is not an integer", %{conn: conn} do
      conn = get(conn, "/games/training")

      assert html_response(conn, 404) =~ "Game not found"
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
      insert(:task, level: "elementary", tags: ["training"])

      conn
      |> post(Routes.game_path(conn, :create_training))
      |> html_response(302)
    end
  end
end
