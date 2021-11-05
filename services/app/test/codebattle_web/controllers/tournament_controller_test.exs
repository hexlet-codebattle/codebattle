defmodule CodebattleWeb.TournamentControllerTest do
  use CodebattleWeb.ConnCase, async: true

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
    intended_player = insert(:user)
    player = insert(:user)

    tournament =
      insert(:token_tournament,
        creator_id: creator.id,
        data: %{
          intended_player_ids: [intended_player.id],
          players: [struct(Codebattle.Tournament.Types.Player, Map.from_struct(player))]
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
      |> put_session(:user_id, intended_player.id)
      |> get(Routes.tournament_path(conn, :show, tournament.id))

    assert new_conn.status == 200

    new_conn =
      conn
      |> put_session(:user_id, player.id)
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
