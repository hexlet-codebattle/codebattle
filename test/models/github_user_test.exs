defmodule Codebattle.GithubUserTest do
  use Codebattle.ModelCase

  alias Codebattle.GithubUser
  alias Ueberauth.Auth

  @valid_data %{
    "name" => Faker.Name.name,
    "emails" => [
      %{"email" => Faker.Internet.email, "primary" => true},
      %{"email" => Faker.Internet.email, "primary" => false},
    ],
  }

  test "new user is created successfully" do
    auth_data = %Auth{
      provider: :github,
      uid: :rand.uniform(100000),
      extra: %{
        raw_info: %{
          user: @valid_data,
        },
      },
    }

    # First time user is created
    {:ok, user1} = GithubUser.find_or_create(auth_data)
    assert user1.github_id == auth_data.uid
    assert user1.name == @valid_data["name"]
    assert user1.email == @valid_data["emails"] |> Enum.at(0) |> Map.get("email")

    # Second time user is updated
    {:ok, user2} = GithubUser.find_or_create(auth_data)
    assert user1.id == user2.id
  end
end
