defmodule Codebattle.UsersRankUpdateServerTest do
  use CodebattleWeb.ConnCase, async: false

  alias Codebattle.UsersRankUpdateServer
  alias Codebattle.{Repo, User}

  test "updates all rank for users" do
    user1 = insert(:user, rating: 10005)
    user2 = insert(:user, rating: 10004)
    user3 = insert(:user, rating: 10003)
    user4 = insert(:user, rating: 10002)
    user5 = insert(:user, rating: 10001)

    :ok = UsersRankUpdateServer.update()

    :timer.sleep(300)

    ranks =
      User
      |> Repo.all()
      |> Enum.filter(fn user -> !user.is_bot end)
      |> Enum.map(fn user -> {user.id, user.rank} end)

    assert ranks == [
             {user1.id, 1},
             {user2.id, 2},
             {user3.id, 3},
             {user4.id, 4},
             {user5.id, 5}
           ]

    # add new user

    user6 = insert(:user, rating: 10003)

    :ok = UsersRankUpdateServer.update()

    :timer.sleep(300)

    ranks =
      User
      |> Repo.all()
      |> Enum.filter(fn user -> !user.is_bot end)
      |> Enum.map(fn user -> {user.id, user.rank} end)

    assert ranks == [
             {user1.id, 1},
             {user2.id, 2},
             {user6.id, 3},
             {user3.id, 3},
             {user4.id, 4},
             {user5.id, 5}
           ]

    # rating has been updated

    user1
    |> User.changeset(%{rating: 10000})
    |> Repo.update!()

    user5
    |> User.changeset(%{rating: 100_100})
    |> Repo.update!()

    user6
    |> User.changeset(%{rating: 100_200})
    |> Repo.update!()

    :ok = UsersRankUpdateServer.update()

    :timer.sleep(300)

    ranks =
      User
      |> Repo.all()
      |> Enum.filter(fn user -> !user.is_bot end)
      |> Enum.map(fn user -> {user.id, user.rank} end)

    assert ranks == [
             {user6.id, 1},
             {user5.id, 2},
             {user2.id, 3},
             {user3.id, 4},
             {user4.id, 5},
             {user1.id, 6}
           ]
  end
end
