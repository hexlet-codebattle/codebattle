defmodule CodebattleWeb.EventControllerTest do
  use CodebattleWeb.ConnCase, async: true

  test ".index", %{conn: conn} do
    admin = insert(:admin)
    event = insert(:event, title: "Code Battle")

    conn =
      conn
      |> log_in_user(admin.id)
      |> get("/admin/events")

    assert html_response(conn, 200) =~ event.title
  end
end
