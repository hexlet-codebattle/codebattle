defmodule CodebattleWeb.Plugs.RescrictAccessTest do
  use CodebattleWeb.ConnCase, async: false

  setup do
    FunWithFlags.enable(:codebattle_mini_version)

    on_exit(fn ->
      FunWithFlags.disable(:codebattle_mini_version)
    end)

    :ok
  end

  test "allows /authorized in mini mode", %{conn: conn} do
    conn = get(conn, "/authorized")

    assert conn.status == 200
  end

  test "allows tournaments with ids from 2 to 22 in mini mode", %{conn: conn} do
    user = insert(:user)
    insert(:tournament, id: 2, creator_id: user.id)

    conn =
      conn
      |> put_session(:user_id, user.id)
      |> get("/tournaments/2")

    assert conn.status != 302
  end

  test "blocks tournaments with ids outside 2 to 22 in mini mode", %{conn: conn} do
    conn = get(conn, "/tournaments/23")

    assert conn.status == 302
    assert redirected_to(conn) == "/"
  end

  test "allows moderator-flagged user to access any tournaments path in mini mode", %{conn: conn} do
    user = insert(:user)
    insert(:tournament, id: 23, creator_id: user.id)
    FunWithFlags.enable(:allow_moderator_tournaments, for_actor: user)

    on_exit(fn ->
      FunWithFlags.disable(:allow_moderator_tournaments, for_actor: user)
    end)

    conn =
      conn
      |> put_session(:user_id, user.id)
      |> get("/tournaments/23")

    assert conn.status != 302
  end
end
