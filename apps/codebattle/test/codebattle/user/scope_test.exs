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

    test "supports identity matching, bot inclusion, empty searches, and every sort key" do
      first = insert(:user, name: "scope-first", email: "first@scope.test", rank: 2, points: 5, rating: 10)
      second = insert(:user, name: "scope-second", email: "second@scope.test", rank: 1, points: 10, rating: 20)
      bot = insert(:user, name: "scope-bot", is_bot: true, rank: 3, points: 1, rating: 30)
      game = insert(:game)
      insert(:user_game, user: second, game: game)

      matches = Codebattle.User |> Scope.by_email_or_name(%{name: "missing", email: first.email}) |> Repo.all()
      assert Enum.map(matches, & &1.id) == [first.id]

      empty_search = %{"q" => %{"name_ilike" => ""}} |> Scope.list_users() |> Repo.all()
      assert Enum.any?(empty_search, &(&1.id == first.id))

      with_bots = %{"with_bots" => "true", "s" => "id+asc"} |> Scope.list_users() |> Repo.all()
      assert Enum.any?(with_bots, &(&1.id == bot.id))

      assert [ranked | _] = %{"s" => "rank+asc"} |> Scope.list_users() |> Repo.all()
      assert ranked.id == second.id
      assert [pointed | _] = %{"s" => "points+desc"} |> Scope.list_users() |> Repo.all()
      assert pointed.id == second.id
      assert [played | _] = %{"s" => "games_played+desc"} |> Scope.list_users() |> Repo.all()
      assert played.id == second.id

      assert [fallback | _] = %{"s" => "unsupported+direction"} |> Scope.list_users() |> Repo.all()
      assert fallback.id == second.id
    end
  end
end
