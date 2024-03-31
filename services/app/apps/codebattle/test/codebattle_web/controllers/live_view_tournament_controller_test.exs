defmodule CodebattleWeb.LiveViewTournamentControllerTest do
  use CodebattleWeb.ConnCase

  alias Codebattle.Tournament

  test "renders index for signed_user", %{conn: conn} do
    user = insert(:user)

    conn =
      conn
      |> put_session(:user_id, user.id)
      |> get(Routes.tournament_path(conn, :index))

    assert conn.status == 200
  end

  test "authorizes to tournaments", %{conn: conn} do
    creator = insert(:user)
    admin = insert(:admin)
    user = insert(:user)

    {:ok, tournament} =
      Tournament.Context.create(%{
        "starts_at" => "2022-02-24T06:00",
        "name" => "Test Arena 2",
        "user_timezone" => "Etc/UTC",
        "level" => "easy",
        "creator" => creator,
        "access_type" => "token",
        "access_token" => "access_token",
        "break_duration_seconds" => 0,
        "type" => "arena",
        "state" => "waiting_participants",
        "players_limit" => 200
      })

    Tournament.Server.handle_event(tournament.id, :join, %{user: user})

    new_conn =
      conn
      |> put_session(:user_id, admin.id)
      |> get(Routes.tournament_path(conn, :show, tournament.id))

    assert new_conn.status == 200

    new_conn =
      conn
      |> put_session(:user_id, creator.id)
      |> get(Routes.tournament_path(conn, :show, tournament.id))

    assert new_conn.status == 200

    new_conn =
      conn
      |> put_session(:user_id, user.id)
      |> get(Routes.tournament_path(conn, :show, tournament.id))

    assert new_conn.status == 200

    new_conn =
      get(
        conn,
        Routes.tournament_path(conn, :show, tournament.id, access_token: tournament.access_token)
      )

    assert new_conn.status == 200

    new_conn = get(conn, Routes.tournament_path(conn, :show, tournament.id))

    assert new_conn.status == 404
  end

  test "renders not found", %{conn: conn} do
    user = insert(:user)

    assert_raise Ecto.NoResultsError, fn ->
      conn
      |> put_session(:user_id, user.id)
      |> get(Routes.tournament_path(conn, :show, 12_313_221))
    end
  end
end
