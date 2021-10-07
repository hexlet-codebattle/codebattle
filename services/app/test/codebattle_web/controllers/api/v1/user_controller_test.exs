defmodule CodebattleWeb.Api.V1.UserControllerTest do
  use CodebattleWeb.ConnCase, async: true

  describe "#index" do
    test "shows rating list", %{conn: conn} do
      user1 =
        insert(:user, %{name: "first", email: "test1@test.test", github_id: 1, rating: 2400})

      insert(:user_game, user: user1, inserted_at: ~N[2000-01-01 23:00:07])
      insert(:user, %{name: "second", email: "test2@test.test", github_id: 2, rating: 2310})
      insert(:user, %{name: "third", email: "test3@test.test", github_id: 3, rating: 2210})
      insert(:user, %{name: "forth", email: "test4@test.test", github_id: 4, rating: 2210})

      conn =
        conn
        |> get(Routes.api_v1_user_path(conn, :index))

      resp_body = json_response(conn, 200)

      assert resp_body["page_info"] == %{
               "page_number" => 1,
               "page_size" => 50,
               "total_entries" => 4,
               "total_pages" => 1
             }

      assert resp_body["date_from"] == nil
      assert Enum.count(resp_body["users"]) == 4
    end

    test "shows rating list with date_from filter", %{conn: conn} do
      date_from = "2020-10-10"

      starts_at =
        date_from
        |> Timex.parse!("{YYYY}-{0M}-{0D}")
        |> Timex.to_naive_datetime()
        |> NaiveDateTime.truncate(:second)

      user1 =
        insert(:user, %{name: "first", email: "test1@test.test", github_id: 1, rating: 2400})

      game = insert(:game, starts_at: starts_at)
      insert(:user_game, user: user1, game: game)
      insert(:user, %{name: "second", email: "test2@test.test", github_id: 2, rating: 2310})
      insert(:user, %{name: "third", email: "test3@test.test", github_id: 3, rating: 2210})
      insert(:user, %{name: "forth", email: "test4@test.test", github_id: 4, rating: 2210})

      conn =
        conn
        |> get(Routes.api_v1_user_path(conn, :index), %{"date_from" => date_from})

      resp_body = json_response(conn, 200)

      assert resp_body["page_info"] == %{
               "page_number" => 1,
               "page_size" => 50,
               "total_entries" => 1,
               "total_pages" => 1
             }

      assert resp_body["date_from"] == date_from
      assert Enum.count(resp_body["users"]) == 1
    end

    test "shows rating list with with search by name_ilike", %{conn: conn} do
      user1 = insert(:user, %{name: "aaa", email: "test1@test.test", github_id: 1, rating: 2400})
      insert(:user_game, user: user1, inserted_at: ~N[2000-01-01 23:00:07])
      insert(:user, %{name: "bbb", email: "test2@test.test", github_id: 2, rating: 2310})
      insert(:user, %{name: "ab", email: "test3@test.test", github_id: 3, rating: 2210})

      conn =
        conn
        |> get(Routes.api_v1_user_path(conn, :index, q: %{name_ilike: "a"}))

      resp_body = json_response(conn, 200)

      assert resp_body["page_info"] == %{
               "page_number" => 1,
               "page_size" => 50,
               "total_entries" => 2,
               "total_pages" => 1
             }

      assert resp_body["date_from"] == nil
      assert Enum.count(resp_body["users"]) == 2
    end

    test "shows rating list sorted by inserted at", %{conn: conn} do
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
               "total_entries" => 1,
               "total_pages" => 1
             }

      assert resp_body["date_from"] == nil

      [first_user | _] = resp_body["users"]

      assert Map.take(first_user, ~w(name email github_id)) == %{
               "name" => "aaa",
               "github_id" => 1
             }
    end
  end

  describe ".stats" do
    test "shows user stats", %{conn: conn} do
      user1 =
        insert(:user, %{
          name: "first",
          email: "test1@test.test",
          github_id: 1,
          rating: 2400,
          achievements: ["played_ten_games", "win_games_with?js_php_ruby"]
        })

      user2 =
        insert(:user, %{name: "second", email: "test2@test.test", github_id: 2, rating: 2310})

      game1 = insert(:game, state: "game_over")
      game2 = insert(:game, state: "game_over")

      insert(:user_game, user: user1, creator: false, game: game1, result: "won")
      insert(:user_game, user: user2, creator: false, game: game1, result: "lost")
      insert(:user_game, user: user1, creator: false, game: game2, result: "lost")
      insert(:user_game, user: user2, creator: false, game: game2, result: "won")

      conn =
        conn
        |> get(Routes.api_v1_user_path(conn, :stats, user1.id))

      resp_body = json_response(conn, 200)

      assert %{
               "stats" => %{"gave_up" => 0, "lost" => 1, "won" => 1},
               "user" => _user
             } = resp_body
    end
  end

  describe ".completed_games" do
    test "shows user stats", %{conn: conn} do
      user1 =
        insert(:user, %{
          name: "first",
          email: "test1@test.test",
          github_id: 1,
          rating: 2400
        })

      user2 =
        insert(:user, %{name: "second", email: "test2@test.test", github_id: 2, rating: 2310})

      game1 = insert(:game, state: "game_over")
      game2 = insert(:game, state: "game_over")

      insert(:user_game, user: user1, creator: false, game: game1, result: "won")
      insert(:user_game, user: user2, creator: false, game: game1, result: "lost")
      insert(:user_game, user: user1, creator: false, game: game2, result: "lost")
      insert(:user_game, user: user2, creator: false, game: game2, result: "won")

      conn =
        conn
        |> get(Routes.api_v1_user_path(conn, :completed_games, user1.id))

      resp_body = json_response(conn, 200)

      %{"games" => games, "page_info" => page_info} = resp_body
      assert Enum.count(games) == 2

      assert page_info == %{
               "page_number" => 1,
               "page_size" => 9,
               "total_entries" => 2,
               "total_pages" => 1
             }
    end
  end

  describe "#current" do
    test "shows current_user when logged in", %{conn: conn} do
      user = insert(:user)

      conn =
        conn
        |> put_session(:user_id, user.id)
        |> get(Routes.api_v1_user_path(conn, :current))

      resp_body = json_response(conn, 200)

      assert resp_body == %{"id" => user.id}
    end

    test "shows current_user when not logged in", %{conn: conn} do
      conn = get(conn, Routes.api_v1_user_path(conn, :current))

      resp_body = json_response(conn, 200)

      assert resp_body == %{"id" => 0}
    end
  end
end
