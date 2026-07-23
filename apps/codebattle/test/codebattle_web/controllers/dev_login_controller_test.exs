defmodule CodebattleWeb.DevLoginControllerTest do
  use CodebattleWeb.ConnCase, async: true

  alias Codebattle.UserSession

  test "creates a user session that is shown in settings", %{conn: conn} do
    conn =
      conn
      |> put_req_header("user-agent", "Codebattle development browser")
      |> post("/auth/dev_login", %{"subscription_type" => "free"})

    assert redirected_to(conn) == "/"

    token = get_session(conn, :user_session_token)
    session = UserSession.get_active_by_token(token)

    assert session.user_agent == "Codebattle development browser"
    assert session.user_id == session.user.id

    conn = get(conn, "/settings")
    response = html_response(conn, 200)

    assert response =~ "user_sessions"
    assert response =~ "Codebattle development browser"
  end
end
