defmodule CodebattleWeb.TournamentControllerTest do
  use CodebattleWeb.ConnCase, async: true

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

    tournament =
      insert(:token_tournament,
        creator_id: creator.id,
        players: %{
          Tournament.Helpers.to_id(user.id) =>
            struct(Codebattle.Tournament.Player, Map.from_struct(user))
        }
      )

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
end
