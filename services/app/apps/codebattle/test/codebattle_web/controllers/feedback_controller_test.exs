defmodule CodebattleWeb.FeedbackControllerTest do
  use CodebattleWeb.ConnCase, async: true

  test "index user", %{conn: conn} do
    conn =
      conn
      |> get(Routes.feedback_path(conn, :index))

    assert conn.status == 200
  end
end
