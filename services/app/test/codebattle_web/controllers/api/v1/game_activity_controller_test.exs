defmodule CodebattleWeb.Api.V1.GameActivityControllerTest do
  use CodebattleWeb.ConnCase, async: true

  test "show game activity", %{conn: conn} do
    insert_list(3, :game, inserted_at: ~N[2000-01-02 22:00:07])
    insert_list(2, :game, inserted_at: ~N[2000-01-01 23:00:07])

    conn =
      conn
      |> get(api_v1_game_activity_path(conn, :show))

    asserted_data = [
      %{"count" => 3, "date" => "2000-01-02"},
      %{"count" => 2, "date" => "2000-01-01"}
    ]

    assert json_response(conn, 200)
           |> Map.get("activities")
           |> Enum.sort(&(Map.get(&1, "count") >= Map.get(&2, "count"))) == asserted_data
  end
end
