defmodule Codebattle.GithubUserTest do
  use CodebattleWeb.ConnCase, async: true

  alias Codebattle.GithubUser

  import CodebattleWeb.Factory

  @valid_data %{
    "login" => Faker.Internet.user_name(),
    "emails" => [
      %{"email" => Faker.Internet.email(), "primary" => true},
      %{"email" => Faker.Internet.email(), "primary" => false}
    ]
  }

  test "new user is created successfully" do
    auth_data = build(:auth, extra: %{raw_info: %{user: @valid_data}})

    # First time user is created
    {:ok, user1} = GithubUser.find_or_create(auth_data)
    assert user1.github_id == auth_data.uid
    assert user1.name == @valid_data["login"]
    assert user1.email == @valid_data["emails"] |> Enum.at(0) |> Map.get("email")

    # Second time user is updated
    user1
      |> User.settings_changeset(%{name: "new_name"})
      |> Repo.update()
    {:ok, user2} = GithubUser.find_or_create(auth_data)
    assert user1.id == user2.id
    assert user2.name == "new_name"
  end

  test "adds hash to name if it already taken" do
    user = insert(:user)
    auth_data = build(:auth, extra: %{raw_info: %{user: %{@valid_data | "login" => user.name}}})

    {:ok, user1} = GithubUser.find_or_create(auth_data)
    assert user1.github_id == auth_data.uid
    assert user1.email == @valid_data["emails"] |> Enum.at(0) |> Map.get("email")
  end
end
