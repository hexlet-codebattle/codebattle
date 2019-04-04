defmodule CodebattleWeb.Api.V1.UserControllerTest do
  use CodebattleWeb.ConnCase, async: true

  test "show rating list", %{conn: conn} do
    user1 = insert(:user, %{name: "first", email: "test1@test.test", github_id: 1, rating: 1000})
    insert_list(3, :user_game, user: user1, inserted_at: ~N[2000-01-02 22:00:07])
    insert_list(2, :user_game, user: user1, inserted_at: ~N[2000-01-01 23:00:07])

    user2 = insert(:user, %{name: "second", email: "test2@test.test", github_id: 2, rating: 1000})
    insert_list(3, :user_game, user: user2, inserted_at: ~N[2000-01-02 22:00:07])
    insert_list(2, :user_game, user: user2, inserted_at: ~N[2000-01-01 23:00:07])

    conn =
      conn
      |> get(api_v1_user_path(conn, :index))

    asserted_data = %{
      "page_info" => %{
        "page_number" => 1,
        "page_size" => 50,
        "total_entries" => 2,
        "total_pages" => 1
      },
      "users" => [
        %{
          "game_count" => 5,
          "github_id" => 1,
          "rating" => 1000,
          "lang" => nil,
          "name" => "first"
        },
        %{
          "game_count" => 5,
          "github_id" => 2,
          "rating" => 1000,
          "lang" => nil,
          "name" => "second"
        }
      ]
    }

    assert json_response(conn, 200) == asserted_data
  end
end
