defmodule CodebattleWeb.Api.V1.ActivityControllerTest do
  use CodebattleWeb.ConnCase, async: true

  test "show user: signed in", %{conn: conn} do
    user = insert(:user)
    today = Date.utc_today()
    current_date = Date.add(today, -5)
    previous_year_date = Date.add(today, -400)

    insert_list(
      3,
      :user_game,
      user: user,
      inserted_at: NaiveDateTime.new!(current_date, ~T[22:00:07])
    )

    insert_list(
      2,
      :user_game,
      user: user,
      inserted_at: NaiveDateTime.new!(previous_year_date, ~T[23:00:07])
    )

    conn =
      conn
      |> put_session(:user_id, user.id)
      |> get(Routes.api_v1_activity_path(conn, :show, user.id))

    response = json_response(conn, 200)

    assert response["activities"] == [
             %{"count" => 3, "date" => Date.to_iso8601(current_date)}
           ]

    assert response["meta"] == %{
             "earliest_activity_date" => Date.to_iso8601(previous_year_date),
             "end_date" => Date.to_iso8601(today),
             "start_date" => Date.to_iso8601(Date.add(today, -364)),
             "year" => nil
           }
  end

  test "show user activity for selected year", %{conn: conn} do
    user = insert(:user)
    selected_year = max(2017, Date.utc_today().year - 1)
    selected_year_date = Date.new!(selected_year, 12, 30)

    insert_list(
      2,
      :user_game,
      user: user,
      inserted_at: NaiveDateTime.new!(selected_year_date, ~T[23:00:07])
    )

    conn =
      conn
      |> put_session(:user_id, user.id)
      |> get(Routes.api_v1_activity_path(conn, :show, user.id, year: selected_year))

    response = json_response(conn, 200)

    assert response["activities"] == [
             %{"count" => 2, "date" => Date.to_iso8601(selected_year_date)}
           ]

    assert response["meta"] == %{
             "earliest_activity_date" => Date.to_iso8601(selected_year_date),
             "end_date" => Date.to_iso8601(Date.new!(selected_year, 12, 31)),
             "start_date" => Date.to_iso8601(Date.new!(selected_year, 1, 1)),
             "year" => selected_year
           }
  end

  test "show user activity for current year uses full calendar range", %{conn: conn} do
    user = insert(:user)
    current_year = Date.utc_today().year
    current_year_date = Date.new!(current_year, 3, 3)

    insert_list(
      1,
      :user_game,
      user: user,
      inserted_at: NaiveDateTime.new!(current_year_date, ~T[12:00:00])
    )

    conn =
      conn
      |> put_session(:user_id, user.id)
      |> get(Routes.api_v1_activity_path(conn, :show, user.id, year: current_year))

    response = json_response(conn, 200)

    assert response["activities"] == [
             %{"count" => 1, "date" => Date.to_iso8601(current_year_date)}
           ]

    assert response["meta"] == %{
             "earliest_activity_date" => Date.to_iso8601(current_year_date),
             "end_date" => Date.to_iso8601(Date.new!(current_year, 12, 31)),
             "start_date" => Date.to_iso8601(Date.new!(current_year, 1, 1)),
             "year" => current_year
           }
  end
end
