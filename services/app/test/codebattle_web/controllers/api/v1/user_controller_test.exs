defmodule CodebattleWeb.Api.V1.UserControllerTest do
  use CodebattleWeb.ConnCase, async: true

  test "show rating list", %{conn: conn} do
    user1 = insert(:user, %{name: "first", email: "test1@test.test", github_id: 1, rating: 2400})
    insert_list(1, :user_game, user: user1, inserted_at: ~N[2000-01-01 23:00:07])

    user2 = insert(:user, %{name: "second", email: "test2@test.test", github_id: 2, rating: 2310})

    user3 = insert(:user, %{name: "third", email: "test3@test.test", github_id: 3, rating: 2210})

    user4 = insert(:user, %{name: "forth", email: "test4@test.test", github_id: 4, rating: 2210})

    conn =
      conn
      |> get(api_v1_user_path(conn, :index, filter: ""))

    resp_body = json_response(conn, 200)

    assert resp_body["page_info"] == %{
             "page_number" => 1,
             "page_size" => 50,
             "total_entries" => 31,
             "total_pages" => 1
           }

    assert Enum.count(resp_body["users"]) == 31
  end

  test "show rating list with filter", %{conn: conn} do
    user1 = insert(:user, %{name: "aaa", email: "test1@test.test", github_id: 1, rating: 2400})
    insert_list(1, :user_game, user: user1, inserted_at: ~N[2000-01-01 23:00:07])

    user2 = insert(:user, %{name: "bbb", email: "test2@test.test", github_id: 2, rating: 2310})

    user3 = insert(:user, %{name: "ab", email: "test3@test.test", github_id: 3, rating: 2210})

    conn =
      conn
      |> get(api_v1_user_path(conn, :index, filter: "a"))

    resp_body = json_response(conn, 200)

    assert resp_body["page_info"] == %{
             "page_number" => 1,
             "page_size" => 50,
             "total_entries" => 19,
             "total_pages" => 1
           }

    assert Enum.count(resp_body["users"]) == 19
  end
end
