defmodule Codebattle.User.RankUpdateTest do
  use CodebattleWeb.ConnCase, async: false

  alias Codebattle.Repo
  alias Codebattle.User

  test "updates all rank for users" do
    user1 = insert(:user, rating: 10_005)
    user2 = insert(:user, rating: 10_004)
    user3 = insert(:user, rating: 10_003)
    user4 = insert(:user, rating: 10_003)
    user5 = insert(:user, rating: 10_002)

    User.RankUpdate.call()

    ranks =
      User
      |> Repo.all()
      |> Enum.filter(fn user -> !user.is_bot end)
      |> Enum.map(fn user -> {user.id, user.rank} end)
      |> MapSet.new()

    assert MapSet.equal?(
             ranks,
             [
               {user1.id, 1},
               {user2.id, 2},
               {user3.id, 3},
               {user4.id, 3},
               {user5.id, 4}
             ]
             |> MapSet.new()
           )

    # add new user

    user6 = insert(:user, rating: 10_003)

    User.RankUpdate.call()

    ranks =
      User
      |> Repo.all()
      |> Enum.filter(fn user -> !user.is_bot end)
      |> Enum.map(fn user -> {user.id, user.rank} end)
      |> MapSet.new()

    assert MapSet.equal?(
             ranks,
             [
               {user1.id, 1},
               {user2.id, 2},
               {user6.id, 3},
               {user3.id, 3},
               {user4.id, 3},
               {user5.id, 4}
             ]
             |> MapSet.new()
           )

    # rating has been updated

    user1
    |> User.changeset(%{rating: 10_000})
    |> Repo.update!()

    user5
    |> User.changeset(%{rating: 100_100})
    |> Repo.update!()

    user6
    |> User.changeset(%{rating: 100_200})
    |> Repo.update!()

    User.RankUpdate.call()

    ranks =
      User
      |> Repo.all()
      |> Enum.filter(fn user -> !user.is_bot end)
      |> Enum.sort_by(fn user -> !user.is_bot end)
      |> Enum.map(fn user -> {user.id, user.rank} end)
      |> MapSet.new()

    assert MapSet.equal?(
             ranks,
             [
               {user6.id, 1},
               {user5.id, 2},
               {user2.id, 3},
               {user3.id, 4},
               {user4.id, 4},
               {user1.id, 5}
             ]
             |> MapSet.new()
           )
  end
end
