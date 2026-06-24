defmodule CodebattleWeb.Tournament.StreamControllerTest do
  use CodebattleWeb.ConnCase

  alias Codebattle.Tournament
  alias CodebattleWeb.Tournament.StreamController
  alias CodebattleWeb.TournamentAdminChannel

  defp create_tournament(creator, attrs \\ %{}) do
    base = %{
      "starts_at" => "2026-02-24T06:00",
      "name" => "Stream Admin Tournament",
      "description" => "desc",
      "user_timezone" => "Etc/UTC",
      "level" => "easy",
      "creator" => creator,
      "break_duration_seconds" => 0,
      "type" => "swiss",
      "state" => "waiting_participants",
      "players_limit" => 200
    }

    {:ok, tournament} = Tournament.Context.create(Map.merge(base, attrs))
    tournament
  end

  describe "GET /tournaments/:id/stream (public moderator stream)" do
    test "renders threejs stream for moderator", %{conn: conn} do
      creator = insert(:user)
      tournament = create_tournament(creator)

      conn =
        conn
        |> put_session(:user_id, creator.id)
        |> get("/tournaments/#{tournament.id}/stream")

      assert conn.status == 200
      assert html_response(conn, 200) =~ "tournament-threejs-stream-root"
    end

    test "returns 404 for non-moderator", %{conn: conn} do
      creator = insert(:user)
      user = insert(:user)
      tournament = create_tournament(creator)

      conn =
        conn
        |> put_session(:user_id, user.id)
        |> get("/tournaments/#{tournament.id}/stream")

      assert conn.status == 404
    end

    test "returns 404 for anonymous", %{conn: conn} do
      creator = insert(:user)
      tournament = create_tournament(creator)
      conn = get(conn, "/tournaments/#{tournament.id}/stream")
      assert conn.status == 404
    end
  end

  describe "GET /admin/tournaments/:id/stream" do
    test "renders LiveView for creator", %{conn: conn} do
      creator = insert(:user)
      tournament = create_tournament(creator)

      conn =
        conn
        |> put_session(:user_id, creator.id)
        |> get("/admin/tournaments/#{tournament.id}/stream")

      body = html_response(conn, 200)
      assert body =~ "Stream Admin"
      assert body =~ tournament.name
      assert body =~ "OBS / stream URLs"
      assert body =~ "widget=leftEditor"
    end

    test "renders LiveView for moderator", %{conn: conn} do
      creator = insert(:user)
      moderator = insert(:user)
      tournament = create_tournament(creator, %{"moderator_ids" => [moderator.id]})

      conn =
        conn
        |> put_session(:user_id, moderator.id)
        |> get("/admin/tournaments/#{tournament.id}/stream")

      assert conn.status == 200
    end

    test "returns 404 for non-moderator", %{conn: conn} do
      creator = insert(:user)
      user = insert(:user)
      tournament = create_tournament(creator)

      conn =
        conn
        |> put_session(:user_id, user.id)
        |> get("/admin/tournaments/#{tournament.id}/stream")

      assert conn.status == 404
    end

    test "returns 404 for anonymous", %{conn: conn} do
      creator = insert(:user)
      tournament = create_tournament(creator)
      conn = get(conn, "/admin/tournaments/#{tournament.id}/stream")
      assert conn.status == 404
    end
  end

  describe "GET /admin/tournaments/:id/stream/state" do
    test "returns JSON state for creator", %{conn: conn} do
      creator = insert(:user)
      tournament = create_tournament(creator)

      conn =
        conn
        |> put_session(:user_id, creator.id)
        |> get("/admin/tournaments/#{tournament.id}/stream/state")

      body = json_response(conn, 200)
      assert body["tournament_id"] == tournament.id
      assert Map.has_key?(body, "current_round")
      assert Map.has_key?(body, "players")
      assert Map.has_key?(body, "clans")
      assert Map.has_key?(body, "active_game_id")
    end

    test "exposes active_game_id stored in the agent", %{conn: conn} do
      creator = insert(:user)
      tournament = create_tournament(creator)
      TournamentAdminChannel.store_active_game(tournament.id, 4242)

      conn =
        conn
        |> put_session(:user_id, creator.id)
        |> get("/admin/tournaments/#{tournament.id}/stream/state")

      assert %{"active_game_id" => 4242} = json_response(conn, 200)
    end

    test "404 for non-moderator", %{conn: conn} do
      creator = insert(:user)
      user = insert(:user)
      tournament = create_tournament(creator)

      conn =
        conn
        |> put_session(:user_id, user.id)
        |> get("/admin/tournaments/#{tournament.id}/stream/state")

      assert %{"error" => "NOT_FOUND"} = json_response(conn, 404)
    end

    test "404 for anonymous", %{conn: conn} do
      creator = insert(:user)
      tournament = create_tournament(creator)
      conn = get(conn, "/admin/tournaments/#{tournament.id}/stream/state")
      assert json_response(conn, 404) == %{"error" => "NOT_FOUND"}
    end

    test "anonymous request with valid auth_token query param is allowed", %{conn: conn} do
      creator = insert(:user)
      tournament = create_tournament(creator)

      api_key = Application.get_env(:codebattle, :api_key) || "test-api-key"

      with_api_key(api_key, fn ->
        conn = get(conn, "/admin/tournaments/#{tournament.id}/stream/state?auth_token=#{api_key}")
        assert %{"tournament_id" => tid} = json_response(conn, 200)
        assert tid == tournament.id
      end)
    end

    test "anonymous request with invalid auth_token is denied", %{conn: conn} do
      creator = insert(:user)
      tournament = create_tournament(creator)

      with_api_key("correct-key", fn ->
        conn = get(conn, "/admin/tournaments/#{tournament.id}/stream/state?auth_token=wrong-key")
        assert json_response(conn, 404) == %{"error" => "NOT_FOUND"}
      end)
    end

    test "anonymous request with valid x-auth-key header is allowed", %{conn: conn} do
      creator = insert(:user)
      tournament = create_tournament(creator)

      with_api_key("header-key", fn ->
        conn =
          conn
          |> put_req_header("x-auth-key", "header-key")
          |> get("/admin/tournaments/#{tournament.id}/stream/state")

        assert %{"tournament_id" => tid} = json_response(conn, 200)
        assert tid == tournament.id
      end)
    end
  end

  describe "build_json_state/1 — active & rank funnel (top200 play-off)" do
    test "Swiss phase (completed 5): active = top-8 by place, rank = place" do
      players = playoff_players(for id <- 1..10, do: {id, id, 1})

      # 5 раундов сыграно (позиция 4, идёт перерыв) → отсечка топ-8 по месту.
      state = StreamController.build_json_state(top200(players, %{current_round_position: 4, break_state: "on"}))

      assert active_by_id(state) == bool_map(1..10, [1, 2, 3, 4, 5, 6, 7, 8])
      assert rank_by_id(state) == Map.new(1..10, &{to_string(&1), &1})
    end

    test "after QF (completed 6): the 4 QF winners (max draw_index) are active" do
      # Победители QF — 1,3,5,7 (draw_index поднят до 2); проигравшие — 2,4,6,8.
      players =
        playoff_players([
          {1, 1, 2},
          {2, 5, 1},
          {3, 2, 2},
          {4, 6, 1},
          {5, 3, 2},
          {6, 7, 1},
          {7, 4, 2},
          {8, 8, 1}
        ])

      state = StreamController.build_json_state(top200(players, %{current_round_position: 5, break_state: "on"}))

      assert active_by_id(state) == bool_map(1..8, [1, 3, 5, 7])
    end

    test "after SF (completed 7): only the 2 finalists (max draw_index) are active" do
      # 1,3 — финалисты (di 3); 5,7 — проигравшие SF; 2,6 — победители утешительных SF; 4,8 — проигравшие.
      players =
        playoff_players([
          {1, 1, 3},
          {3, 2, 3},
          {5, 3, 2},
          {7, 4, 2},
          {2, 5, 2},
          {6, 6, 2},
          {4, 7, 1},
          {8, 8, 1}
        ])

      state = StreamController.build_json_state(top200(players, %{current_round_position: 6, break_state: "on"}))

      assert active_by_id(state) == bool_map(1..8, [1, 3])
    end

    test "after final (completed 8): only the champion is active — исход A, чемпион 1" do
      players =
        playoff_players([
          {1, 1, 4},
          {3, 2, 3},
          {5, 3, 2},
          {7, 4, 2},
          {2, 5, 2},
          {6, 6, 2},
          {4, 7, 1},
          {8, 8, 1}
        ])

      state = StreamController.build_json_state(top200(players, %{state: "finished", current_round_position: 7}))

      assert active_by_id(state) == bool_map(1..8, [1])
    end

    test "after final (completed 8): only the champion is active — исход B, чемпион 3" do
      # Тот же расклад, но финал за 1-2 выиграл игрок 3 → активен он, а не 1.
      players =
        playoff_players([
          {3, 1, 4},
          {1, 2, 3},
          {5, 3, 2},
          {7, 4, 2},
          {2, 5, 2},
          {6, 6, 2},
          {4, 7, 1},
          {8, 8, 1}
        ])

      state = StreamController.build_json_state(top200(players, %{state: "finished", current_round_position: 7}))

      assert active_by_id(state) == bool_map(1..8, [3])
    end

    test "active is always a boolean, rank tracks current place" do
      players = playoff_players([{1, 2, 4}, {2, 1, 3}])
      state = StreamController.build_json_state(top200(players, %{state: "finished", current_round_position: 7}))

      assert rank_by_id(state) == %{"1" => 2, "2" => 1}
      assert Enum.all?(state.players, &is_boolean(&1.active))
    end
  end

  describe "build_json_state/1 — win_prob (top200 play-off, driven by draw_index)" do
    test "after QF (completed 6): win_prob = each main-net survivor's share of the active pool" do
      # Winners 1,3,5,7 carry draw_index 2 → they are the active main net; 2,4,6,8 (draw_index 1)
      # are eliminated. Pool history scores 40/30/20/10 sum to 100 → clean percentage shares.
      players = playoff_players([{1, 1, 2}, {2, 5, 1}, {3, 2, 2}, {4, 6, 1}, {5, 3, 2}, {6, 7, 1}, {7, 4, 2}, {8, 8, 1}])
      tournament = top200(players, %{current_round_position: 5, break_state: "on"})

      seed_game_result(tournament.id, 1, 5, {1, 40}, {2, 10})
      seed_game_result(tournament.id, 2, 5, {3, 30}, {4, 10})
      seed_game_result(tournament.id, 3, 5, {5, 20}, {6, 10})
      seed_game_result(tournament.id, 4, 5, {7, 10}, {8, 10})

      state = StreamController.build_json_state(tournament)

      assert win_prob_by_id(state) == %{
               "1" => "40",
               "3" => "30",
               "5" => "20",
               "7" => "10",
               "2" => "",
               "4" => "",
               "6" => "",
               "8" => ""
             }
    end

    test "Swiss phase (completed < 5): win_prob is blank for everyone, even with history" do
      players = playoff_players([{1, 1, 1}, {2, 2, 1}])
      tournament = top200(players, %{current_round_position: 2})
      seed_game_result(tournament.id, 1, 2, {1, 50}, {2, 10})

      state = StreamController.build_json_state(tournament)

      assert Enum.all?(state.players, &(&1.win_prob == ""))
    end
  end

  defp top200(players, attrs) do
    base = %{
      id: System.unique_integer([:positive]),
      type: "top200",
      state: "active",
      current_round_position: 0,
      break_state: "off",
      rounds_limit: 8,
      use_clan: false,
      players: players,
      players_table: nil,
      matches_table: nil
    }

    struct(Tournament, Map.merge(base, attrs))
  end

  # specs: list of {id, place, draw_index}
  defp playoff_players(specs) do
    Map.new(specs, fn {id, place, draw_index} ->
      {id,
       struct(Tournament.Player, %{id: id, name: "p#{id}", place: place, draw_index: draw_index, score: 1000 - place})}
    end)
  end

  # Insert the two per-game TournamentResult rows get_users_history's self-join needs
  # (one per player, same game_id, distinct user_ids).
  defp seed_game_result(tournament_id, game_id, round, {user_a, score_a}, {user_b, score_b}) do
    Codebattle.Repo.insert_all(Tournament.TournamentResult, [
      result_row(tournament_id, game_id, round, user_a, score_a),
      result_row(tournament_id, game_id, round, user_b, score_b)
    ])
  end

  defp result_row(tournament_id, game_id, round, user_id, score) do
    %{
      tournament_id: tournament_id,
      game_id: game_id,
      user_id: user_id,
      user_name: "p#{user_id}",
      task_id: game_id * 100 + user_id,
      score: score,
      round_position: round,
      result_percent: Decimal.new(100)
    }
  end

  defp win_prob_by_id(state), do: Map.new(state.players, fn p -> {p.id, p.win_prob} end)

  defp active_by_id(state), do: Map.new(state.players, fn p -> {p.id, p.active} end)

  defp rank_by_id(state), do: Map.new(state.players, fn p -> {p.id, p.rank} end)

  defp bool_map(ids, active_ids) do
    active = MapSet.new(active_ids)
    Map.new(ids, fn id -> {to_string(id), MapSet.member?(active, id)} end)
  end

  defp with_api_key(key, fun) do
    previous = Application.get_env(:codebattle, :api_key)
    Application.put_env(:codebattle, :api_key, key)

    try do
      fun.()
    after
      if previous == nil do
        Application.delete_env(:codebattle, :api_key)
      else
        Application.put_env(:codebattle, :api_key, previous)
      end
    end
  end
end
