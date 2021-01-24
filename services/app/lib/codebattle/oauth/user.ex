defmodule Codebattle.Oauth.User do
  @moduledoc """
    dispatcher for oauth
  """

  alias Ueberauth.Auth
  alias Codebattle.{Repo, User}

  def find_or_create(%Auth{provider: :discord} = auth) do
    Codebattle.Oauth.User.DiscordUser.find_or_create(auth)
  end

  def find_or_create(%Auth{provider: :github} = auth) do
    Codebattle.Oauth.User.GithubUser.find_or_create(auth)
  end

  def update(user, %Auth{provider: :discord} = auth) do
    Codebattle.Oauth.User.DiscordUser.update(user, auth)
  end

  def find_or_create(%{provider: :dev_local} = auth) do
    user_data = %{
      github_id: "35539033",
      name: auth.name,
      github_name: auth.name,
      email: auth.email
    }

    changeset = User.changeset(%User{}, user_data)
    {:ok, user} = Repo.insert(changeset)

    {:ok, user}
  end
end
