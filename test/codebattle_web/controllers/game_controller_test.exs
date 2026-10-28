defmodule CodebattleWeb.GameControllerTest do
  use CodebattleWeb.ConnCase, async: false

  import Ecto.Query, warn: false
  import Inertia.Testing

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

      conn = get(conn, Routes.game_path(conn, :show, game.id))

      assert html_response(conn, 200)
      assert inertia_component(conn) == "GameRoom"
      assert %{"game_id" => game_id} = inertia_props(conn)
      assert game_id == game.id
    end

    test "shows live game_over game", %{conn: conn} do
      users = build_list(2, :user)
      task = build(:task)
      {:ok, game} = Game.Context.create_game(%{state: "game_over", players: users, task: task})

      conn = get(conn, Routes.game_path(conn, :show, game.id))

      assert html_response(conn, 200)
      assert inertia_component(conn) == "GameRoom"
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
        |> log_in_user(current_user.id)
        |> get(Routes.game_path(conn, :show, game.id))

      assert html_response(conn, 200)
      assert %{"game" => %{hide_banned_player_controls: true}} = inertia_props(conn)
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
      |> log_in_user(user1.id)
      |> delete(Routes.game_path(conn, :delete, game.id))
      |> html_response(302)

      updated = Game.Context.get_game!(game.id)
      assert updated.is_live == false
      assert updated.state == "canceled"
    end
  end

  describe "POST /games/create_by_task" do
    test "keeps the training game in the lobby snapshot after returning home", %{conn: conn} do
      user = insert(:user)
      task = insert(:task, state: "active", visibility: "public")
      conn = log_in_user(conn, user.id)

      create_conn =
        post(conn, Routes.game_path(conn, :create_by_task), %{
          "task_id" => task.id
        })

      %{"game_id" => game_id} = json_response(create_conn, 200)
      on_exit(fn -> Game.Context.terminate_game(game_id) end)

      assert {:ok, game} = Game.Context.fetch_game(game_id)
      assert game.mode == "standard"
      assert game.is_bot
      assert game.use_chat
      assert game.visibility_type == "hidden"
      assert game.task.id == task.id

      lobby_conn = get(conn, Routes.root_path(conn, :index))

      assert %{"active_games" => active_games} = inertia_props(lobby_conn)
      assert Enum.any?(active_games, &(&1.id == game_id))
    end
  end

  describe "POST /games/create_by_task visibility" do
    test "returns 404 for a hidden task of another user", %{conn: conn} do
      user = insert(:user)
      task = insert(:task, visibility: "hidden")

      conn
      |> log_in_user(user.id)
      |> post(Routes.game_path(conn, :create_by_task), %{"task_id" => task.id})
      |> json_response(404)
    end

    test "returns 404 for a malformed task id", %{conn: conn} do
      user = insert(:user)

      conn
      |> log_in_user(user.id)
      |> post(Routes.game_path(conn, :create_by_task), %{"task_id" => "1; drop"})
      |> json_response(404)
    end

    test "creates a game for an own hidden task", %{conn: conn} do
      user = insert(:user)
      task = insert(:task, visibility: "hidden", creator_id: user.id)

      %{"game_id" => game_id} =
        conn
        |> log_in_user(user.id)
        |> post(Routes.game_path(conn, :create_by_task), %{"task_id" => task.id})
        |> json_response(200)

      on_exit(fn -> Game.Context.terminate_game(game_id) end)
    end
  end

  describe "POST /games/:id/join" do
    test "joins game", %{conn: conn} do
      task = insert(:task, level: "elementary")

      [user1, user2] = insert_list(2, :user)

      {:ok, game} =
        Game.Context.create_game(%{state: "waiting_opponent", players: [user1], task: task})

      conn
      |> log_in_user(user2.id)
      |> post(Routes.game_path(conn, :join, game.id))
      |> html_response(302)

      updated = Game.Context.get_game!(game.id)
      user1_id = user1.id
      user2_id = user2.id
      assert updated.is_live == true
      assert updated.state == "playing"
      assert [%{id: ^user1_id}, %{id: ^user2_id}] = updated.players
    end

    test "a player of another game is sent to that game with the reason", %{conn: conn} do
      task = insert(:task, level: "elementary")
      [host, user] = insert_list(2, :user)

      {:ok, game} = Game.Context.create_game(%{state: "waiting_opponent", players: [host], task: task})
      {:ok, own} = Game.Context.create_game(%{state: "waiting_opponent", players: [user], task: task})
      on_exit(fn -> Enum.each([game.id, own.id], &Game.Context.terminate_game/1) end)

      conn =
        conn
        |> log_in_user(user.id)
        |> post(Routes.game_path(conn, :join, game.id))

      assert redirected_to(conn) == Routes.game_path(conn, :show, own.id)
      assert Phoenix.Flash.get(conn.assigns.flash, :warning) =~ "already in another game"
      assert Game.Context.get_game!(game.id).state == "waiting_opponent"
    end

    test "a started game is opened for watching", %{conn: conn} do
      task = insert(:task, level: "elementary")
      [host, guest, user] = insert_list(3, :user)

      {:ok, game} = Game.Context.create_game(%{state: "waiting_opponent", players: [host], task: task})
      on_exit(fn -> Game.Context.terminate_game(game.id) end)
      {:ok, _game} = Game.Context.join_game(game.id, guest)

      conn =
        conn
        |> log_in_user(user.id)
        |> post(Routes.game_path(conn, :join, game.id))

      assert redirected_to(conn) == Routes.game_path(conn, :show, game.id)
      assert Phoenix.Flash.get(conn.assigns.flash, :warning) =~ "already started"
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

  describe "POST games/:id/ml/reviews" do
    test "only moderators can record a decision; it is hidden from ordinary viewers", %{conn: conn} do
      [first, second] = insert_list(2, :user)
      admin = insert(:admin)
      {:ok, game} = Game.Context.create_game(%{state: "game_over", players: [first, second], task: insert(:task)})
      assert {:ok, _} = Game.BotDetection.analyze_and_persist(game.id)
      attrs = %{user_id: first.id, outcome: "legitimate", reason: "Checked the replay and Vim commands"}
      forbidden = conn |> log_in_user(first.id) |> post("/games/#{game.id}/ml/reviews", attrs)
      assert response(forbidden, 403)
      saved = conn |> log_in_user(admin.id) |> post("/games/#{game.id}/ml/reviews", attrs)
      assert redirected_to(saved) == "/games/#{game.id}/ml"
      public = conn |> log_in_user(first.id) |> get("/games/#{game.id}/ml")
      assert inertia_props(public)["reviews"] == []
      private = conn |> log_in_user(admin.id) |> get("/games/#{game.id}/ml")
      assert [%{outcome: "legitimate"}] = inertia_props(private)["reviews"]
      invalid = conn |> log_in_user(admin.id) |> post("/games/#{game.id}/ml/reviews", %{user_id: "invalid"})
      assert response(invalid, 422)
    end
  end

  describe "GET games/:id/ml" do
    test "opens the report for any user once the game is over, without Re-analyze", %{conn: conn} do
      [first, second] = insert_list(2, :user)
      viewer = insert(:user)
      {:ok, game} = Game.Context.create_game(%{state: "game_over", players: [first, second], task: insert(:task)})

      conn = conn |> log_in_user(viewer.id) |> get("/games/#{game.id}/ml")

      assert inertia_component(conn) == "GameMl"
      assert %{"game_id" => game_id, "can_manage" => false, "players" => players} = inertia_props(conn)
      assert game_id == game.id
      assert length(players) == 2
    end

    test "sends users back to the game while it is played", %{conn: conn} do
      [first, second] = insert_list(2, :user)
      {:ok, game} = Game.Context.create_game(%{state: "playing", players: [first, second], task: insert(:task)})

      conn = conn |> log_in_user(first.id) |> get("/games/#{game.id}/ml")

      assert redirected_to(conn) == "/games/#{game.id}"
    end

    test "opens the report for admins during play", %{conn: conn} do
      [first, second] = insert_list(2, :user)
      admin = insert(:admin)
      {:ok, game} = Game.Context.create_game(%{state: "playing", players: [first, second], task: insert(:task)})

      conn = conn |> log_in_user(admin.id) |> get("/games/#{game.id}/ml")

      assert inertia_component(conn) == "GameMl"
      assert %{"can_manage" => true} = inertia_props(conn)
    end
  end
end
