defmodule Codebattle.Oauth.User.GithubUser do
  @moduledoc """
    Retrieve user information from github oauth request
  """

  alias Ueberauth.Auth
  alias Codebattle.{Repo, User}

  def find_or_create(%Auth{provider: :github} = auth) do
    user = User |> Repo.get_by(github_id: auth.uid)

    github_name = auth.extra.raw_info.user["login"]

    user_data = %{
      github_id: auth.uid,
      name: name(user, github_name),
      github_name: github_name,
      email: email_from_auth(auth)
    }

    user =
      case user do
        nil ->
          changeset = User.changeset(%User{}, user_data)
          {:ok, user} = Repo.insert(changeset)
          user

        _ ->
          changeset = User.changeset(user, user_data)
          {:ok, user} = Repo.update(changeset)

          user
      end

    {:ok, user}
  end

  def update(user, auth) do
    github_user = User |> Repo.get_by(github_id: auth.uid)

    if github_user != nil && github_user.id != user.id do
      {:error, "github_id has been taken"}
    else
      github_name = auth.extra.raw_info.user["login"]

      user_data = %{
        github_id: auth.uid,
        name: name(user, github_name),
        github_name: github_name,
        email: email_from_auth(auth)
      }

      changeset = User.changeset(user, user_data)
      Repo.update(changeset)
    end
  end

  def unbind(user) do
    user
    |> User.changeset(%{github_id: nil, github_name: nil})
    |> Repo.update()
  end

  defp name(user, github_name) do
    case user do
      nil ->
        case Repo.get_by(User, name: github_name) do
          %User{} ->
            generate_name(github_name)

          _ ->
            github_name
        end

      _ ->
        user.name
    end
  end

  defp generate_name(name) do
    new_name = "#{name}_#{:crypto.strong_rand_bytes(2) |> Base.encode16()}"

    case Repo.get_by(User, name: new_name) do
      %User{} ->
        generate_name(name)

      _ ->
        new_name
    end
  end

  defp email_from_auth(auth) do
    auth.extra.raw_info.user["emails"]
    |> Enum.find(fn item -> item["primary"] end)
    |> Map.get("email")
  end
end
