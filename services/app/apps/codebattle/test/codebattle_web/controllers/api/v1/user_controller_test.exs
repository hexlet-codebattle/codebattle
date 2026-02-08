defmodule CodebattleWeb.Api.V1.UserControllerTest do
  use CodebattleWeb.ConnCase, async: false

  alias Codebattle.User.Achievements

  describe "#index" do
    test "shows rating list", %{conn: conn} do
      user1 =
        insert(:user, %{name: "first", email: "test1@test.test", github_id: 1, rating: 2400})

      insert(:user_game, user: user1, inserted_at: ~N[2000-01-01 23:00:07])
      insert(:user, %{name: "second", email: "test2@test.test", github_id: 2, rating: 2310})
      insert(:user, %{name: "third", email: "test3@test.test", github_id: 3, rating: 2210})
      insert(:user, %{name: "forth", email: "test4@test.test", github_id: 4, rating: 2210})

      conn = get(conn, Routes.api_v1_user_path(conn, :index))

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
      starts_at = ~N[2020-10-10 10:00:00]

      user1 =
        insert(:user, %{name: "first", email: "test1@test.test", github_id: 1, rating: 2400})

      game = insert(:game, starts_at: starts_at)
      insert(:user_game, user: user1, game: game)
      insert(:user, %{name: "second", email: "test2@test.test", github_id: 2, rating: 2310})
      insert(:user, %{name: "third", email: "test3@test.test", github_id: 3, rating: 2210})
      insert(:user, %{name: "forth", email: "test4@test.test", github_id: 4, rating: 2210})

      conn = get(conn, Routes.api_v1_user_path(conn, :index), %{"date_from" => date_from})

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

      conn = get(conn, Routes.api_v1_user_path(conn, :index, q: %{name_ilike: "a"}))

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

      conn = get(conn, Routes.api_v1_user_path(conn, :index, s: "inserted_at+asc"))

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

  describe "stats" do
    test "shows user stats", %{conn: conn} do
      user1 = insert(:user, %{name: "1", github_id: 1, rating: 2400})
      user2 = insert(:user, %{name: "2", github_id: 2, rating: 2310})
      game1 = insert(:game, state: "game_over")
      game2 = insert(:game, state: "game_over")
      game3 = insert(:game, state: "game_over")
      %{id: game4_id} = insert(:game, state: "playing", player_ids: [user1.id])
      insert(:user_game, user: user1, creator: false, game: game1, result: "won", lang: "js")
      insert(:user_game, user: user2, creator: false, game: game1, result: "lost", lang: "js")
      insert(:user_game, user: user1, creator: false, game: game2, result: "lost", lang: "ruby")
      insert(:user_game, user: user2, creator: false, game: game2, result: "won", lang: "ruby")
      insert(:user_game, user: user1, creator: false, game: game3, result: "lost", lang: "golang")
      insert(:user_game, user: user2, creator: false, game: game3, result: "won", lang: "golang")
      :ok = Achievements.recalculate_user(user1.id)
      :ok = Achievements.recalculate_user(user2.id)

      resp_body =
        conn
        |> get(Routes.api_v1_user_path(conn, :stats, user1.id))
        |> json_response(200)

      assert %{
               "active_game_id" => ^game4_id,
               "stats" => %{"all" => []},
               "metrics" => %{
                 "game_stats" => %{"gave_up" => 0, "lost" => 2, "won" => 1}
               },
               "user" => _user
             } = resp_body

      resp_body =
        conn
        |> get(Routes.api_v1_user_path(conn, :stats, user2.id))
        |> json_response(200)

      assert %{
               "active_game_id" => nil,
               "stats" => %{"all" => []},
               "metrics" => %{
                 "game_stats" => %{"gave_up" => 0, "lost" => 1, "won" => 2}
               },
               "user" => _user
             } = resp_body
    end
  end

  describe "achievements" do
    test "shows lightweight achievements and metrics payload", %{conn: conn} do
      user = insert(:user, %{name: "1", github_id: 1, rating: 2400})
      bot = insert(:user, %{is_bot: true, name: "bot"})
      game = insert(:game, state: "game_over")
      %{id: active_game_id} = insert(:game, state: "playing", player_ids: [user.id])

      insert(:user_game, user: user, creator: false, game: game, result: "won", lang: "js")
      insert(:user_game, user: bot, creator: false, game: game, result: "lost", lang: "js")

      :ok = Achievements.recalculate_user(user.id)

      resp_body =
        conn
        |> get(Routes.api_v1_user_path(conn, :achievements, user.id))
        |> json_response(200)

      assert %{
               "active_game_id" => ^active_game_id,
               "metrics" => %{
                 "game_stats" => %{"gave_up" => 0, "lost" => 0, "won" => 1}
               },
               "achievements" => achievements,
               "user" => _user
             } = resp_body

      refute Map.has_key?(resp_body, "stats")
      assert is_list(achievements)
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
