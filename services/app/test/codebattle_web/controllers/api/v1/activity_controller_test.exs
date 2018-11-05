defmodule CodebattleWeb.Api.V1.ActivityControllerTest do
  use CodebattleWeb.ConnCase, async: true

  test "show user: signed in", %{conn: conn} do
    user = insert(:user)
    insert_list(3, :user_game, user: user)
    insert_list(2, :user_game, user: user, inserted_at: ~N[2000-01-01 23:00:07])

    conn =
      conn
      |> put_session(:user_id, user.id)
      |> get(api_v1_activity_path(conn, :show))

    assert json_response(conn, 200) == %{
              "activities" => [
                %{"count" => 2, "date" => "2000-01-01"},
                %{"count" => 3, "date" => "2018-11-05"}
              ]
            }
  end

end
