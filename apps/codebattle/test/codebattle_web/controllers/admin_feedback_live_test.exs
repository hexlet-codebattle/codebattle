defmodule CodebattleWeb.AdminFeedbackLiveTest do
  use CodebattleWeb.ConnCase, async: true

  test "admin can open feedback page", %{conn: conn} do
    admin = insert(:admin)
    insert(:feedback, status: "Bug", text: "Broken button", author_name: "alice")

    conn =
      conn
      |> put_session(:user_id, admin.id)
      |> get("/admin/feedback")

    assert conn.status == 200
    assert response(conn, 200) =~ "Feedback"
    assert response(conn, 200) =~ "Broken button"
  end

  test "admin can open admin overview page", %{conn: conn} do
    admin = insert(:admin)
    insert(:user)
    insert(:task)
    insert(:game)
    insert(:tournament)

    conn =
      conn
      |> put_session(:user_id, admin.id)
      |> get("/admin")

    assert conn.status == 200
    assert response(conn, 200) =~ "Codebattle Admin Dashboard"
    assert response(conn, 200) =~ "User Registrations by Day"
    assert response(conn, 200) =~ "Games Created by Day"
    assert response(conn, 200) =~ "Unique Active Users by Day"
    assert response(conn, 200) =~ "Users"
    assert response(conn, 200) =~ "Tasks"
    assert response(conn, 200) =~ "Games"
    assert response(conn, 200) =~ "Tournaments"
    assert response(conn, 200) =~ "/admin/users"
    assert response(conn, 200) =~ "/admin/seasons"
    assert response(conn, 200) =~ "/admin/feedback"
    assert response(conn, 200) =~ "/admin/games"
    assert response(conn, 200) =~ "/admin/code-checks"
    assert response(conn, 200) =~ "/feature-flags"
    assert response(conn, 200) =~ "/admin/dashboard"
  end

  test "admin can open online games page", %{conn: conn} do
    admin = insert(:admin)

    conn =
      conn
      |> put_session(:user_id, admin.id)
      |> get("/admin/games")

    assert conn.status == 200
    assert response(conn, 200) =~ "Online Games"
    assert response(conn, 200) =~ "Active games now"
  end

  test "admin can open code checks page", %{conn: conn} do
    admin = insert(:admin)

    conn =
      conn
      |> put_session(:user_id, admin.id)
      |> get("/admin/code-checks")

    assert conn.status == 200
    assert response(conn, 200) =~ "Code Checks Live"
    assert response(conn, 200) =~ "Languages"
    assert response(conn, 200) =~ "Aggregated timeline for selected languages."
  end

  test "non-admin is redirected", %{conn: conn} do
    user = insert(:user)

    conn =
      conn
      |> put_session(:user_id, user.id)
      |> get("/admin/feedback")

    assert conn.status == 302
    assert redirected_to(conn) == "/"
  end
end
