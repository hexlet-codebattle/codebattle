defmodule CodebattleWeb.Tournament.StreamControllerTest do
  use CodebattleWeb.ConnCase

  import Inertia.Testing

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
    test "renders the stream page for moderator", %{conn: conn} do
      creator = insert(:user)
      tournament = create_tournament(creator)

      conn =
        conn
        |> log_in_user(creator.id)
        |> get("/tournaments/#{tournament.id}/stream")

      assert conn.status == 200
      assert html_response(conn, 200)
      assert inertia_component(conn) == "TournamentStream"
    end

    test "returns 404 for non-moderator", %{conn: conn} do
      creator = insert(:user)
      user = insert(:user)
      tournament = create_tournament(creator)

      conn =
        conn
        |> log_in_user(user.id)
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
        |> log_in_user(creator.id)
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
        |> log_in_user(moderator.id)
        |> get("/admin/tournaments/#{tournament.id}/stream")

      assert conn.status == 200
    end

    test "returns 404 for non-moderator", %{conn: conn} do
      creator = insert(:user)
      user = insert(:user)
      tournament = create_tournament(creator)

      conn =
        conn
        |> log_in_user(user.id)
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
        |> log_in_user(creator.id)
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
        |> log_in_user(creator.id)
        |> get("/admin/tournaments/#{tournament.id}/stream/state")

      assert %{"active_game_id" => 4242} = json_response(conn, 200)
    end

    test "404 for non-moderator", %{conn: conn} do
      creator = insert(:user)
      user = insert(:user)
      tournament = create_tournament(creator)

      conn =
        conn
        |> log_in_user(user.id)
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

  describe "build_json_state/1 — active & rank funnel" do
    test "completed 5 rounds: active = top-8 by place, rank = place" do
      players = playoff_players(for id <- 1..10, do: {id, id, 1})

      # 5 раундов сыграно (позиция 4, идёт перерыв) → отсечка топ-8 по месту.
      state = StreamController.build_json_state(swiss(players, %{current_round_position: 4, break_state: "on"}))

      assert active_by_id(state) == bool_map(1..10, [1, 2, 3, 4, 5, 6, 7, 8])
      assert rank_by_id(state) == Map.new(1..10, &{to_string(&1), &1})
    end

    test "active is always a boolean, rank tracks current place" do
      players = playoff_players([{1, 2, 4}, {2, 1, 3}])
      state = StreamController.build_json_state(swiss(players, %{state: "finished", current_round_position: 7}))

      assert rank_by_id(state) == %{"1" => 2, "2" => 1}
      assert Enum.all?(state.players, &is_boolean(&1.active))
    end
  end

  describe "build_json_state/1 — clans" do
    test "lists the clans of the shown players with their names" do
      clan = insert(:clan, name: "clan-a", long_name: "Clan A")

      players = %{
        1 => struct(Tournament.Player, %{id: 1, name: "p1", place: 1, clan_id: clan.id, clan: "clan-a"}),
        2 => struct(Tournament.Player, %{id: 2, name: "p2", place: 2})
      }

      state = StreamController.build_json_state(swiss(players, %{}))

      assert state.clans == %{to_string(clan.id) => %{name: "clan-a", long_name: "Clan A"}}
      assert %{clan_id: clan_id, clan: "clan-a"} = Enum.find(state.players, &(&1.id == "1"))
      assert clan_id == to_string(clan.id)
    end
  end

  defp swiss(players, attrs) do
    base = %{
      id: System.unique_integer([:positive]),
      type: "swiss",
      state: "active",
      current_round_position: 0,
      break_state: "off",
      rounds_limit: 8,
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
