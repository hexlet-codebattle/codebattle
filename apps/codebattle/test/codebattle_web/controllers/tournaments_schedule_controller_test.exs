defmodule CodebattleWeb.TournamentsScheduleControllerTest do
  use CodebattleWeb.ConnCase, async: true

  import Inertia.Testing

  test "renders the schedule as an Inertia page", %{conn: conn} do
    user = insert(:user)

    conn =
      conn
      |> put_session(:user_id, user.id)
      |> get(Routes.tournaments_schedule_path(conn, :index))

    assert inertia_component(conn) == "TournamentsSchedule"

    assert %{
             "page_title" => "Tournament schedule",
             "current_user" => %{id: current_user_id},
             "user_token" => user_token
           } = inertia_props(conn)

    assert current_user_id == user.id
    assert is_binary(user_token)
    assert html_response(conn, 200) =~ ~s(id="app")
  end

  test "returns the Inertia protocol response", %{conn: conn} do
    user = insert(:user)

    conn =
      conn
      |> put_session(:user_id, user.id)
      |> get(Routes.tournaments_schedule_path(conn, :index))

    version = conn.private.inertia_version

    conn =
      conn
      |> recycle()
      |> put_req_header("x-inertia", "true")
      |> put_req_header("x-inertia-version", version)
      |> get(Routes.tournaments_schedule_path(conn, :index))

    assert get_resp_header(conn, "x-inertia") == ["true"]
    assert json_response(conn, 200)["component"] == "TournamentsSchedule"
  end
end
