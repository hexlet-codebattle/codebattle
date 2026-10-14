defmodule CodebattleWeb.TournamentsScheduleControllerTest do
  use CodebattleWeb.ConnCase, async: true

  test "redirects to the tournaments page (the schedule is one of its tabs)", %{conn: conn} do
    user = insert(:user)

    conn =
      conn
      |> log_in_user(user.id)
      |> get(Routes.tournaments_schedule_path(conn, :index))

    assert redirected_to(conn) == Routes.tournament_path(conn, :index)
  end
end
