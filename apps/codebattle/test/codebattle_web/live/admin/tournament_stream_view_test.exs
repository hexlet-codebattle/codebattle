defmodule CodebattleWeb.Live.Admin.TournamentStreamViewTest do
  use CodebattleWeb.ConnCase

  alias Codebattle.Tournament
  alias CodebattleWeb.TournamentAdminChannel

  defp create_tournament(creator, attrs \\ %{}) do
    base = %{
      "starts_at" => "2026-02-24T06:00",
      "name" => "Stream LV Tournament",
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

  defp signed_conn(conn, user) do
    put_session(conn, :user_id, user.id)
  end

  describe "mount" do
    test "renders for creator", %{conn: conn} do
      creator = insert(:user)
      tournament = create_tournament(creator)

      {:ok, _view, html} =
        live(signed_conn(conn, creator), "/admin/tournaments/#{tournament.id}/stream")

      assert html =~ "Stream Admin"
      assert html =~ tournament.name
      assert html =~ "Open full stream"
      assert html =~ "JSON state"
    end

    test "shows all OBS widget URLs", %{conn: conn} do
      creator = insert(:user)
      tournament = create_tournament(creator)

      {:ok, _view, html} =
        live(signed_conn(conn, creator), "/admin/tournaments/#{tournament.id}/stream")

      for widget <- ~w(leftEditor rightEditor timer task examples leftTests rightTests) do
        assert html =~ "widget=#{widget}"
      end
    end

    test "shows current active game from agent", %{conn: conn} do
      creator = insert(:user)
      tournament = create_tournament(creator)
      TournamentAdminChannel.store_active_game(tournament.id, 4711)

      {:ok, _view, html} =
        live(signed_conn(conn, creator), "/admin/tournaments/#{tournament.id}/stream")

      assert html =~ "#4711"
    end
  end

  describe "events" do
    setup %{conn: conn} do
      creator = insert(:user)
      tournament = create_tournament(creator)

      {:ok, view, _html} =
        live(signed_conn(conn, creator), "/admin/tournaments/#{tournament.id}/stream")

      %{view: view, tournament: tournament, creator: creator}
    end

    test "set_active stores game and broadcasts to stream subscribers", %{
      view: view,
      tournament: tournament
    } do
      Codebattle.PubSub.subscribe("tournament:#{tournament.id}:stream")

      render_hook(view, "set_active", %{"game_id" => "321"})

      assert_receive %{
        event: "tournament:stream:active_game",
        payload: %{game_id: 321}
      }

      assert TournamentAdminChannel.get_active_game(tournament.id) == 321
      assert render(view) =~ "#321"
    end

    test "set_active ignores non-integer game_id", %{view: view, tournament: tournament} do
      render_hook(view, "set_active", %{"game_id" => "garbage"})
      assert TournamentAdminChannel.get_active_game(tournament.id) == nil
    end

    test "clear_active resets active game", %{view: view, tournament: tournament} do
      TournamentAdminChannel.store_active_game(tournament.id, 9999)
      render_hook(view, "clear_active", %{})
      assert TournamentAdminChannel.get_active_game(tournament.id) == nil
    end

    test "set_filter updates the active filter", %{view: view} do
      html = render_hook(view, "set_filter", %{"filter" => "all"})
      assert html =~ "btn-primary"
    end

    test "incoming stream:active_game PubSub updates active id", %{
      view: view,
      tournament: tournament
    } do
      Codebattle.PubSub.broadcast("tournament:stream:active_game", %{
        tournament_id: tournament.id,
        game_id: 888
      })

      assert render(view) =~ "#888"
    end
  end

  describe "authorization" do
    test "returns 404 for anonymous user", %{conn: conn} do
      creator = insert(:user)
      tournament = create_tournament(creator)
      conn = get(conn, "/admin/tournaments/#{tournament.id}/stream")
      assert conn.status == 404
    end

    test "returns 404 for non-moderator", %{conn: conn} do
      creator = insert(:user)
      user = insert(:user)
      tournament = create_tournament(creator)

      conn =
        conn
        |> signed_conn(user)
        |> get("/admin/tournaments/#{tournament.id}/stream")

      assert conn.status == 404
    end
  end
end
