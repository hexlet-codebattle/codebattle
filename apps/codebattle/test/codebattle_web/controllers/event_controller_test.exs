defmodule CodebattleWeb.EventControllerTest do
  use CodebattleWeb.ConnCase, async: true

  test ".index", %{conn: conn} do
    admin = insert(:admin)
    event = insert(:event, title: "University Battle")

    conn =
      conn
      |> put_session(:user_id, admin.id)
      |> get("/admin/events")

    assert html_response(conn, 200) =~ event.title
  end
end
