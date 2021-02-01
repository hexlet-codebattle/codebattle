defmodule Codebattle.Oauth.User.DiscordUserTest do
  use CodebattleWeb.ConnCase, async: true

  alias Codebattle.Oauth.User.DiscordUser

  import CodebattleWeb.Factory

  @valid_data %{
    "username" => Faker.Internet.user_name(),
    "email" => Faker.Internet.email()
  }

  test "new user is created successfully" do
    auth_data = build(:auth, extra: %{raw_info: %{user: @valid_data}}, provider: :discord)

    {:ok, user1} = DiscordUser.find_or_create(auth_data)
    assert user1.discord_id == auth_data.uid
    assert user1.name == @valid_data["username"]
    assert user1.email == @valid_data["email"]

    user1
    |> User.settings_changeset(%{name: "new_name"})
    |> Repo.update()

    {:ok, user2} = DiscordUser.find_or_create(auth_data)
    assert user1.id == user2.id
    assert user2.name == "new_name"
  end

  test "adds hash to name if it already taken" do
    user = insert(:user)

    auth_data =
      build(:auth,
        extra: %{raw_info: %{user: %{@valid_data | "username" => user.name}}},
        provider: :discord
      )

    {:ok, user} = DiscordUser.find_or_create(auth_data)
    assert user.discord_id == auth_data.uid
    assert user.email == @valid_data["email"]
  end
end
