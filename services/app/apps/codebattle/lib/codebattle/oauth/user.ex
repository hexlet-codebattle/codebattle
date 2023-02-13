defmodule Codebattle.Oauth.User do
  @moduledoc """
    dispatcher for oauth
  """

  alias Codebattle.Repo
  alias Codebattle.User

  def find_by_token(token) do
    Codebattle.Oauth.User.TokenUser.find(token)
  end

  def find_or_create_dev_user(params) do
    user_data = %{name: params.name, email: params.email}

    changeset = User.changeset(%User{}, user_data)
    Repo.insert(changeset)
  end

  def find_by_firebase(user_attrs) do
    Codebattle.Oauth.User.FirebaseUser.find(user_attrs)
  end

  def create_in_firebase(user_attrs) do
    Codebattle.Oauth.User.FirebaseUser.create(user_attrs)
  end

  def reset_in_firebase(user_attrs) do
    Codebattle.Oauth.User.FirebaseUser.reset(user_attrs)
  end
end
