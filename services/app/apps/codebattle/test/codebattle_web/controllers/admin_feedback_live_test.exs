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
    assert response(conn, 200) =~ "Users"
    assert response(conn, 200) =~ "Tasks"
    assert response(conn, 200) =~ "Games"
    assert response(conn, 200) =~ "Tournaments"
    assert response(conn, 200) =~ "/admin/users"
    assert response(conn, 200) =~ "/admin/seasons"
    assert response(conn, 200) =~ "/admin/feedback"
    assert response(conn, 200) =~ "/feature-flags"
    assert response(conn, 200) =~ "/admin/dashboard"
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
