defmodule CodebattleWeb.Api.V1.UserControllerTest do
  use CodebattleWeb.ConnCase, async: true

  test "show rating list", %{conn: conn} do
    user1 = insert(:user, %{name: "first", email: "test1@test.test", github_id: 1, rating: 2400})
    insert_list(1, :user_game, user: user1, inserted_at: ~N[2000-01-01 23:00:07])

    _user2 =
      insert(:user, %{name: "second", email: "test2@test.test", github_id: 2, rating: 2310})

    _user3 = insert(:user, %{name: "third", email: "test3@test.test", github_id: 3, rating: 2210})

    _user4 = insert(:user, %{name: "forth", email: "test4@test.test", github_id: 4, rating: 2210})

    conn =
      conn
      |> get(Routes.api_v1_user_path(conn, :index))

    resp_body = json_response(conn, 200)

    assert resp_body["page_info"] == %{
             "page_number" => 1,
             "page_size" => 50,
             "total_entries" => 31,
             "total_pages" => 1
           }

    assert Enum.count(resp_body["users"]) == 31
  end

  test "show rating list with with search by name_ilike", %{conn: conn} do
    user1 = insert(:user, %{name: "aaa", email: "test1@test.test", github_id: 1, rating: 2400})
    insert_list(1, :user_game, user: user1, inserted_at: ~N[2000-01-01 23:00:07])

    _user2 = insert(:user, %{name: "bbb", email: "test2@test.test", github_id: 2, rating: 2310})

    _user3 = insert(:user, %{name: "ab", email: "test3@test.test", github_id: 3, rating: 2210})

    conn =
      conn
      |> get(Routes.api_v1_user_path(conn, :index, q: %{name_ilike: "a"}))

    resp_body = json_response(conn, 200)

    assert resp_body["page_info"] == %{
             "page_number" => 1,
             "page_size" => 50,
             "total_entries" => 19,
             "total_pages" => 1
           }

    assert Enum.count(resp_body["users"]) == 19
  end

  test "show rating list sorted by inserted at", %{conn: conn} do
    user1 =
      insert(
        :user,
        %{
          name: "aaa",
          email: "test1@test.test",
          github_id: 1,
          rating: 2400,
          inserted_at: ~N[2000-01-01 23:00:07]
        }
      )

    conn =
      conn
      |> get(Routes.api_v1_user_path(conn, :index, s: "inserted_at+asc"))

    resp_body = json_response(conn, 200)

    assert resp_body["page_info"] == %{
             "page_number" => 1,
             "page_size" => 50,
             "total_entries" => 28,
             "total_pages" => 1
           }

    [first_user | _] = resp_body["users"]

    assert Map.take(first_user, ~w(name email github_id)) == %{
             "name" => "aaa",
             "github_id" => 1
           }
  end
end
