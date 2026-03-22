defmodule Codebattle.User.ScopeTest do
  use CodebattleWeb.ConnCase, async: false

  alias Codebattle.User.Scope

  describe "#list_users" do
    test "finds users by username" do
      user1 =
        insert(:user, %{name: "first", email: "test1@test.test", github_id: 1, rating: 2400})

      _user2 =
        insert(:user, %{name: "second", email: "test2@test.test", github_id: 2, rating: 2310})

      _user3 =
        insert(:user, %{name: "third", email: "test3@test.test", github_id: 3, rating: 2210})

      params = %{"q" => %{"name_ilike" => "first"}}
      query = Scope.list_users(params)
      [result] = Repo.all(query)
      assert user1.id == result.id
    end

    test "sorts users by permitted attributes" do
      user1 =
        insert(:user, %{name: "first", email: "test1@test.test", github_id: 1, rating: 2400})

      user2 =
        insert(:user, %{name: "second", email: "test2@test.test", github_id: 2, rating: 2310})

      _user3 =
        insert(:user, %{name: "third", email: "test3@test.test", github_id: 3, rating: 2210})

      params = %{"s" => "rating+desc"}
      query = Scope.list_users(params)
      [result_1, result_2] = query |> Repo.all() |> Enum.take(2)
      assert result_1.id == user1.id
      assert result_2.id == user2.id
    end

    test "sorts users by permitted attributes in asc order" do
      user1 =
        insert(:user, %{name: "first", email: "test1@test.test", github_id: 1, rating: 0})

      user2 =
        insert(:user, %{name: "second", email: "test2@test.test", github_id: 2, rating: 10})

      _user3 =
        insert(:user, %{name: "third", email: "test3@test.test", github_id: 3, rating: 2210})

      params = %{"s" => "rating+asc"}
      query = Scope.list_users(params)
      [result_1, result_2] = query |> Repo.all() |> Enum.take(2)
      assert result_1.id == user1.id
      assert result_2.id == user2.id
    end

    test "keeps persisted rating for filtered periods" do
      user =
        insert(:user, %{name: "first", email: "test1@test.test", github_id: 1, rating: 2400})

      game = insert(:game, starts_at: ~N[2026-03-22 10:00:00], state: "game_over")
      insert(:user_game, user: user, game: game, inserted_at: ~N[2026-03-22 10:00:00], rating_diff: nil)

      params = %{"date_from" => "2026-03-21"}
      query = Scope.list_users(params)

      [result] = Repo.all(query)
      assert result.id == user.id
      assert result.rating == 2400
    end
  end
end
