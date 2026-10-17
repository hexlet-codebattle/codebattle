defmodule CodebattleWeb.TournamentControllerTest do
  use CodebattleWeb.ConnCase

  import Inertia.Testing

  alias Codebattle.Tournament

  test "renders index for signed_user", %{conn: conn} do
    user = insert(:user)

    conn =
      conn
      |> log_in_user(user.id)
      |> get(Routes.tournament_path(conn, :index))

    assert conn.status == 200
    assert inertia_component(conn) == "TournamentIndex"
    assert %{"last_tournament" => nil, "task_pack_names" => []} = inertia_props(conn)
  end

  test "ships last created tournament for prefill", %{conn: conn} do
    user = insert(:user)
    insert(:tournament, creator: nil, creator_id: user.id, name: "Prev", type: "swiss")

    conn =
      conn
      |> log_in_user(user.id)
      |> get(Routes.tournament_path(conn, :index))

    assert %{"last_tournament" => %{name: "Prev", type: "swiss"}} = inertia_props(conn)
  end

  test "authorizes to tournaments", %{conn: conn} do
    creator = insert(:user)
    admin = insert(:admin)
    user = insert(:user)

    {:ok, tournament} =
      Tournament.Context.create(%{
        "starts_at" => "2022-02-24T06:00",
        "name" => "Test Arena 2",
        "description" => "Test Arena 2 description",
        "user_timezone" => "Etc/UTC",
        "level" => "easy",
        "creator" => creator,
        "access_type" => "token",
        "access_token" => "access_token",
        "break_duration_seconds" => 0,
        "type" => "swiss",
        "state" => "waiting_participants",
        "players_limit" => 200
      })

    Tournament.Server.handle_event(tournament.id, :join, %{user: user})

    new_conn =
      conn
      |> log_in_user(admin.id)
      |> get(Routes.tournament_path(conn, :show, tournament.id))

    assert new_conn.status == 200
    assert inertia_component(new_conn) == "TournamentRoom"

    assert %{"tournament_id" => tournament_id, "tournament_access_token" => nil} =
             inertia_props(new_conn)

    assert tournament_id == tournament.id

    new_conn =
      conn
      |> log_in_user(creator.id)
      |> get(Routes.tournament_path(conn, :show, tournament.id))

    assert new_conn.status == 200

    new_conn =
      conn
      |> log_in_user(user.id)
      |> get(Routes.tournament_path(conn, :show, tournament.id))

    assert new_conn.status == 200

    new_conn =
      conn
      |> log_in_user(user.id)
      |> get(Routes.tournament_path(conn, :show, tournament.id, access_token: tournament.access_token))

    assert new_conn.status == 200

    new_conn = get(conn, Routes.tournament_path(conn, :show, tournament.id))

    assert new_conn.status == 302
  end

  test "redirects guests without the token of a private tournament to login", %{conn: conn} do
    creator = insert(:user)

    {:ok, tournament} =
      Tournament.Context.create(%{
        "starts_at" => "2022-02-24T06:00",
        "name" => "Private Tournament",
        "description" => "Private tournament description",
        "user_timezone" => "Etc/UTC",
        "level" => "easy",
        "creator" => creator,
        "access_type" => "token",
        "access_token" => "access_token",
        "break_duration_seconds" => 0,
        "type" => "swiss",
        "state" => "waiting_participants",
        "players_limit" => 200
      })

    new_conn = get(conn, Routes.tournament_path(conn, :show, tournament.id))

    assert redirected_to(new_conn, 302) ==
             Routes.session_path(CodebattleWeb.Endpoint, :new, next: Routes.tournament_path(conn, :show, tournament.id))
  end

  test "shows guests the public tournament page", %{conn: conn} do
    creator = insert(:user)

    {:ok, tournament} =
      Tournament.Context.create(%{
        "starts_at" => "2022-02-24T06:00",
        "name" => "Open Arena",
        "description" => "Open Arena description",
        "user_timezone" => "Etc/UTC",
        "level" => "easy",
        "creator" => creator,
        "break_duration_seconds" => 0,
        "type" => "swiss",
        "state" => "waiting_participants",
        "players_limit" => 200
      })

    new_conn = get(conn, Routes.tournament_path(conn, :show, tournament.id))

    assert new_conn.status == 200
    assert inertia_component(new_conn) == "TournamentPublic"

    assert %{
             "tournament" => %{name: "Open Arena", description: "Open Arena description", players_count: 0},
             "top_players" => [],
             "next" => next
           } = inertia_props(new_conn)

    assert next == Routes.tournament_path(conn, :show, tournament.id)
  end

  test "shows guests with the invite token the public page of a private tournament", %{conn: conn} do
    creator = insert(:user)

    {:ok, tournament} =
      Tournament.Context.create(%{
        "starts_at" => "2022-02-24T06:00",
        "name" => "Private Tournament",
        "description" => "Private tournament description",
        "user_timezone" => "Etc/UTC",
        "level" => "easy",
        "creator" => creator,
        "access_type" => "token",
        "access_token" => "access_token",
        "break_duration_seconds" => 0,
        "type" => "swiss",
        "state" => "waiting_participants",
        "players_limit" => 200
      })

    path = Routes.tournament_path(conn, :show, tournament.id, access_token: tournament.access_token)
    new_conn = get(conn, path)

    assert inertia_component(new_conn) == "TournamentPublic"
    # Signing up comes back with the token.
    assert %{"next" => ^path} = inertia_props(new_conn)
  end

  test "renders not found", %{conn: conn} do
    user = insert(:user)

    assert_raise Ecto.NoResultsError, fn ->
      conn
      |> log_in_user(user.id)
      |> get(Routes.tournament_path(conn, :show, 12_313_221))
    end
  end

  test "renders tournament page when redirect-to-latest-game is enabled and user has no latest game", %{conn: conn} do
    FunWithFlags.enable(:tournament_redirect_to_latest_game)

    creator = insert(:user)

    {:ok, tournament} =
      Tournament.Context.create(%{
        "starts_at" => "2022-02-24T06:00",
        "name" => "Redirect Guard Tournament",
        "description" => "Redirect Guard Tournament description",
        "user_timezone" => "Etc/UTC",
        "level" => "easy",
        "creator" => creator,
        "access_type" => "token",
        "access_token" => "access_token",
        "break_duration_seconds" => 0,
        "type" => "swiss",
        "state" => "waiting_participants",
        "players_limit" => 200
      })

    new_conn =
      conn
      |> log_in_user(creator.id)
      |> get(Routes.tournament_path(conn, :show, tournament.id))

    assert new_conn.status == 200
  end
end
