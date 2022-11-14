defmodule CodebattleWeb.Api.V1.GameControllerTest do
  use CodebattleWeb.ConnCase, async: true

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
      insert(:game, state: "timeout")

      insert(:user_game, user: user1, creator: false, game: game1, result: "won")
      insert(:user_game, user: user2, creator: false, game: game1, result: "lost")
      insert(:user_game, user: user1, creator: false, game: game2, result: "lost")
      insert(:user_game, user: user2, creator: false, game: game2, result: "won")

      resp_body =
        conn
        |> get(Routes.api_v1_game_path(conn, :completed))
        |> json_response(200)

      %{"games" => games, "page_info" => page_info} = resp_body
      assert Enum.count(games) == 2

      assert page_info == %{
               "page_number" => 1,
               "page_size" => 15,
               "total_entries" => 2,
               "total_pages" => 1
             }

      resp_body =
        conn
        |> get(Routes.api_v1_game_path(conn, :completed, %{user_id: user1.id}))
        |> json_response(200)

      %{"games" => games, "page_info" => page_info} = resp_body
      assert Enum.count(games) == 2

      assert page_info == %{
               "page_number" => 1,
               "page_size" => 15,
               "total_entries" => 2,
               "total_pages" => 1
             }

      resp_body =
        conn
        |> get(
          Routes.api_v1_game_path(conn, :completed, %{user_id: user1.id, page: 2, page_size: 1})
        )
        |> json_response(200)

      %{"games" => games, "page_info" => page_info} = resp_body
      assert Enum.count(games) == 1

      assert page_info == %{
               "page_number" => 2,
               "page_size" => 1,
               "total_entries" => 2,
               "total_pages" => 3
             }
    end
  end
end
