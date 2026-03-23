defmodule CodebattleWeb.LocaleTest do
  use CodebattleWeb.ConnCase, async: false

  setup do
    previous_force_locale = Application.get_env(:codebattle, :force_locale)

    on_exit(fn ->
      Application.put_env(:codebattle, :force_locale, previous_force_locale)
    end)

    :ok
  end

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

  test "uses forced locale over current user locale", %{conn: conn} do
    Application.put_env(:codebattle, :force_locale, "ru")
    user = insert(:user, locale: "en")

    conn =
      conn
      |> put_session(:user_id, user.id)
      |> get(Routes.root_path(conn, :index))

    assert get_session(conn, :locale) == "ru"
  end

  test "ignores unsupported forced locale", %{conn: conn} do
    Application.put_env(:codebattle, :force_locale, "de")
    user = insert(:user, locale: "ru")

    conn =
      conn
      |> put_session(:user_id, user.id)
      |> get(Routes.root_path(conn, :index))

    assert get_session(conn, :locale) == "ru"
  end
end
