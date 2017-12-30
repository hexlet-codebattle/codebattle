defmodule CodebattleWeb.LocaleTest do
  use CodebattleWeb.ConnCase, async: true

  test "get en locale as default", %{conn: conn} do
    conn = get conn, page_path(conn, :index)
    assert html_response(conn, 200) =~ "Welcome to Codebattle!"
  end

  test "get ru locale when it is specified", %{conn: conn} do
    conn = get conn, page_path(conn, :index), locale: "ru"
    assert html_response(conn, 200) =~ "Добро пожаловать в Codebattle"
  end
end
