defmodule CodebattleWeb.LocaleTest do
  use CodebattleWeb.ConnCase, async: false

  setup do
    previous_force_locale = Application.get_env(:codebattle, :force_locale)
    Application.delete_env(:codebattle, :force_locale)

    on_exit(fn ->
      Application.put_env(:codebattle, :force_locale, previous_force_locale)
    end)

    :ok
  end

  test "uses current user locale when available", %{conn: conn} do
    user = insert(:user, locale: "ru")

    conn =
      conn
      |> log_in_user(user.id)
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
      |> log_in_user(user.id)
      |> get(Routes.root_path(conn, :index))

    assert get_session(conn, :locale) == "en"
  end

  test "uses forced locale over current user locale", %{conn: conn} do
    Application.put_env(:codebattle, :force_locale, "ru")
    user = insert(:user, locale: "en")

    conn =
      conn
      |> log_in_user(user.id)
      |> get(Routes.root_path(conn, :index))

    assert get_session(conn, :locale) == "ru"
  end

  test "ignores unsupported forced locale", %{conn: conn} do
    Application.put_env(:codebattle, :force_locale, "de")
    user = insert(:user, locale: "ru")

    conn =
      conn
      |> log_in_user(user.id)
      |> get(Routes.root_path(conn, :index))

    assert get_session(conn, :locale) == "ru"
  end

  test "remembers a guest's locale on the landing page and subsequent pages", %{conn: conn} do
    conn = patch(conn, "/api/v1/locale", %{locale: "ru"})

    assert json_response(conn, 200) == %{"locale" => "ru"}

    conn = conn |> recycle() |> get("/")
    assert get_session(conn, :locale) == "ru"
    assert Gettext.get_locale(CodebattleWeb.Gettext) == "ru"

    conn = conn |> recycle() |> get("/session/new")
    assert get_session(conn, :locale) == "ru"

    conn = conn |> recycle() |> patch("/api/v1/locale", %{locale: "en"})
    assert json_response(conn, 200) == %{"locale" => "en"}

    conn = conn |> recycle() |> get("/")
    assert get_session(conn, :locale) == "en"
  end

  test "saves the signed-in user's locale across sessions", %{conn: conn} do
    user = insert(:user, locale: "en")

    response =
      conn
      |> log_in_user(user.id)
      |> patch("/api/v1/locale", %{locale: "ru", name: "UnwantedChange"})

    assert json_response(response, 200) == %{"locale" => "ru"}
    assert Repo.get!(User, user.id).locale == "ru"
    assert Repo.get!(User, user.id).name == user.name

    conn = conn |> log_in_user(user.id) |> get("/")
    assert get_session(conn, :locale) == "ru"
  end

  test "account locale takes priority over the guest session after signing in", %{conn: conn} do
    user = insert(:user, locale: "en")

    conn =
      conn
      |> put_session(:locale, "ru")
      |> log_in_user(user.id)
      |> get("/")

    assert get_session(conn, :locale) == "en"
  end

  test "ignores unsupported session locales", %{conn: conn} do
    conn = conn |> put_session(:locale, "de") |> get("/")

    assert get_session(conn, :locale) == "en"
  end

  test "rejects missing and unsupported locale choices without changing the preference", %{conn: conn} do
    user = insert(:user, locale: "ru")
    conn = log_in_user(conn, user.id)

    for params <- [%{}, %{locale: "de"}, %{locale: nil}, %{locale: ["en"]}] do
      response = patch(conn, "/api/v1/locale", params)

      assert json_response(response, 422) == %{"error" => "Unsupported locale"}
      assert Repo.get!(User, user.id).locale == "ru"
    end
  end

  test "keeps the forced locale when switching is disabled", %{conn: conn} do
    Application.put_env(:codebattle, :force_locale, "ru")
    user = insert(:user, locale: "ru")

    response =
      conn
      |> log_in_user(user.id)
      |> patch("/api/v1/locale", %{locale: "en"})

    assert json_response(response, 403) == %{"error" => "Locale is fixed for this deployment"}
    assert Repo.get!(User, user.id).locale == "ru"

    conn = conn |> put_session(:locale, "en") |> get("/")
    assert get_session(conn, :locale) == "ru"
  end
end
