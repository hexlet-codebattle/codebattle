defmodule Codebattle.GithubUser do
  @moduledoc """
    Retrieve user information from github oauth request
  """

  import Ecto.Query

  alias Ueberauth.Auth
  alias Codebattle.{Repo, User}

  def find_or_create(%Auth{provider: :github} = auth) do
    user =
      User
      |> Ecto.Query.where(github_id: ^auth.uid)
      |> Ecto.Query.first()
      |> Repo.one()

    github_name = auth.extra.raw_info.user["login"]
    name = case user do
      nil ->
        case Repo.get_by(User, name: github_name) do
          %User{} ->
            "#{github_name}1"
          _ ->
            github_name
        end
      _ ->
        user.name
    end
    user_data = %{
      github_id: auth.uid,
      name: name,
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

  defp email_from_auth(auth) do
    auth.extra.raw_info.user["emails"]
    |> Enum.find(fn item -> item["primary"] end)
    |> Map.get("email")
  end
end
