defmodule Codebattle.PageControllerTest do
  use CodebattleWeb.ConnCase, async: true

  test "GET /", %{conn: conn} do
    conn = get conn, "/"
    assert html_response(conn, 200) =~ "Welcome to Codebattle!"
  end
end
