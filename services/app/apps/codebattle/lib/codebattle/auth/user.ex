defmodule Codebattle.Auth.User do
  @moduledoc """
    dispatcher for Auth
  """

  alias Codebattle.Repo
  alias Codebattle.User

  def find_by_token(token) do
    Codebattle.Auth.User.TokenUser.find(token)
  end

  def create_token_user(params) do
    %User{} |> User.token_changeset(params) |> Repo.insert()
  end

  def create_dev_user(params) do
    %User{} |> User.changeset(params) |> Repo.insert()
  end

  def find_by_firebase(user_attrs) do
    Codebattle.Auth.User.FirebaseUser.find(user_attrs)
  end

  def create_in_firebase(user_attrs) do
    Codebattle.Auth.User.FirebaseUser.create(user_attrs)
  end

  def reset_in_firebase(user_attrs) do
    Codebattle.Auth.User.FirebaseUser.reset(user_attrs)
  end
end
