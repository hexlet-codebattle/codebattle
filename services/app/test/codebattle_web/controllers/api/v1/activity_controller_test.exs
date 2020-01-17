defmodule CodebattleWeb.Api.V1.ActivityControllerTest do
  use CodebattleWeb.ConnCase, async: true

  test "show user: signed in", %{conn: conn} do
    user = insert(:user)
    insert_list(3, :user_game, user: user, inserted_at: ~N[2000-01-02 22:00:07])
    insert_list(2, :user_game, user: user, inserted_at: ~N[2000-01-01 23:00:07])

    conn =
      conn
      |> put_session(:user_id, user.id)
      |> get(Routes.api_v1_activity_path(conn, :show, user.id))

    asserted_data = [
      %{"count" => 3, "date" => "2000-01-02"},
      %{"count" => 2, "date" => "2000-01-01"}
    ]

    assert json_response(conn, 200)
           |> Map.get("activities")
           |> Enum.sort(&(Map.get(&1, "count") >= Map.get(&2, "count"))) == asserted_data
  end
end
