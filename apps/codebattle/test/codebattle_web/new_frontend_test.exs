defmodule CodebattleWeb.NewFrontendTest do
  use CodebattleWeb.ConnCase

  import Inertia.Testing

  test "flagged user gets the lobby in the new frontend layout", %{conn: conn} do
    user = insert(:user)
    FunWithFlags.enable(:new_frontend, for_actor: user)

    conn =
      conn
      |> log_in_user(user.id)
      |> get(Routes.root_path(conn, :index))

    html = html_response(conn, 200)

    assert inertia_component(conn) == "Lobby"
    assert %{"active_games" => _, "user_token" => _, "branding" => %{logo_title: _}} = inertia_props(conn)
    assert html =~ "data-mantine-color-scheme"
    refute html =~ ~s(id="lobby-loading-shell")
    refute html =~ "inertia-shared-props"
  end

  test "other users keep the legacy layout", %{conn: conn} do
    flagged = insert(:user)
    FunWithFlags.enable(:new_frontend, for_actor: flagged)
    user = insert(:user)

    conn =
      conn
      |> log_in_user(user.id)
      |> get(Routes.root_path(conn, :index))

    html = html_response(conn, 200)

    assert inertia_component(conn) == "Lobby"
    refute Map.has_key?(inertia_props(conn), "branding")
    assert html =~ ~s(id="lobby-loading-shell")
    refute html =~ "data-mantine-color-scheme"
  end

  test "guests are never switched" do
    refute CodebattleWeb.NewFrontend.enabled?(%Plug.Conn{assigns: %{current_user: %{is_guest: true}}})
  end
end
