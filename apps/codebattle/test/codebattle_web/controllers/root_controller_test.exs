defmodule Codebattle.RootControllerTest do
  use CodebattleWeb.ConnCase, async: true

  import Inertia.Testing

  test "index", %{conn: conn} do
    conn = get(conn, "/")
    assert html_response(conn, 200)
  end

  test "renders the authenticated lobby through Inertia", %{conn: conn} do
    user = insert(:user)

    conn =
      conn
      |> log_in_user(user.id)
      |> get(Routes.root_path(conn, :index))

    assert html_response(conn, 200)
    assert inertia_component(conn) == "Lobby"
    assert %{"active_games" => _, "task_tags" => _} = inertia_props(conn)
    assert html_response(conn, 200) =~ ~s(id="lobby-loading-shell")
  end

  test "authorized page", %{conn: conn} do
    conn = get(conn, "/authorized")

    assert html_response(conn, 200) =~
             "You successfully authorized to the platform. Open your tournament link to start."
  end
end
