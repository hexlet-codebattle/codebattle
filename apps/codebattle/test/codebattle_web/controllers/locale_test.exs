defmodule CodebattleWeb.LocaleTest do
  use CodebattleWeb.ConnCase, async: true

  test "uses current user locale when available", %{conn: conn} do
    user = insert(:user, locale: "ru")

    conn =
      conn
      |> put_session(:user_id, user.id)
      |> get(Routes.root_path(conn, :index))

    assert get_session(conn, :locale) == "ru"
  end

  test "falls back to default locale for anonymous user", %{conn: conn} do
    conn = get(conn, Routes.root_path(conn, :index))

    assert get_session(conn, :locale) == "en"
  end

  test "falls back to default locale for unsupported user locale", %{conn: conn} do
    user = insert(:user, locale: "de")

    conn =
      conn
      |> put_session(:user_id, user.id)
      |> get(Routes.root_path(conn, :index))

    assert get_session(conn, :locale) == "en"
  end
end
