defmodule CodebattleWeb.Tournament.StreamControllerTest do
  use CodebattleWeb.ConnCase

  alias Codebattle.Tournament
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
