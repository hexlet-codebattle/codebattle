defmodule Codebattle.Auth.User.GithubUser do
  @moduledoc """
    Retrieve user information from github oauth request
  """

  alias Codebattle.Repo
  alias Codebattle.User

  @spec find_or_create(map()) :: {:ok, User.t()} | {:error, term()}
  def find_or_create(profile) do
    User
    |> Repo.get_by(github_id: profile.id)
    |> case do
      nil ->
        github_name = profile.login

        params = %{
          github_id: profile.id,
          name: unique_name(github_name),
          github_name: github_name,
          email: profile.email,
          avatar_url: profile.avatar_url
        }

        %User{}
        |> User.changeset(params)
        |> Repo.insert()

      user ->
        {:ok, user}
    end
  end

  @spec bind(User.t(), map()) :: {:ok, User.t()} | {:error, :term}
  def bind(user, profile) do
    github_user = Repo.get_by(User, github_id: profile.id)

    if github_user != nil && github_user.id != user.id do
      {:error, "User with #{github_user.id} already registered."}
    else
      github_name = profile.login

      params = %{
        github_id: profile.id,
        github_name: github_name,
        email: profile.email,
        avatar_url: profile.avatar_url
      }

      user
      |> Repo.reload()
      |> User.changeset(params)
      |> Repo.update()
    end
  end

  @spec unbind(User.t()) :: {:ok, User.t()} | {:error, :term}
  def unbind(user) do
    user
    |> User.changeset(%{github_id: nil, github_name: nil})
    |> Repo.update()
  end

  defp unique_name(github_name) do
    case Repo.get_by(User, name: github_name) do
      %User{} ->
        generate_unique_name(github_name)

      _ ->
        github_name
    end
  end

  defp generate_unique_name(name) do
    new_name = "#{name}_#{:crypto.strong_rand_bytes(2) |> Base.encode16()}"

    case Repo.get_by(User, name: new_name) do
      %User{} ->
        generate_unique_name(name)

      _ ->
        new_name
    end
  end
end
