defmodule Codebattle.User.ScopeTest do
  use CodebattleWeb.ConnCase, async: true

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
      [result] = query |> Repo.all()
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
        insert(:user, %{name: "first", email: "test1@test.test", github_id: 1, rating: -2400})

      user2 =
        insert(:user, %{name: "second", email: "test2@test.test", github_id: 2, rating: -2310})

      _user3 =
        insert(:user, %{name: "third", email: "test3@test.test", github_id: 3, rating: 2210})

      params = %{"s" => "rating+asc"}
      query = Scope.list_users(params)
      [result_1, result_2] = query |> Repo.all() |> Enum.take(2)
      assert result_1.id == user1.id
      assert result_2.id == user2.id
    end
  end
end
