defmodule CodebattleWeb.GithubUser do
  @moduledoc """
    Retrieve user information from github oauth request
  """

  import Ecto.Query

  alias Ueberauth.Auth
  alias CodebattleWeb.User

  def find_or_create(%Auth{provider: :github} = auth) do
    user_data = %{
      github_id: auth.uid,
      name: auth.extra.raw_info.user["login"],
      email: email_from_auth(auth),
    }

    user = User
      |> Ecto.Query.where(github_id: ^user_data.github_id)
      |> Ecto.Query.first
      |> Codebattle.Repo.one

    user = case user do
      nil ->
        changeset = User.changeset(%User{}, user_data)
        {:ok, user} = Codebattle.Repo.insert(changeset)
        user

      _ ->
        changeset = User.changeset(user, user_data)
        {:ok, user} = Codebattle.Repo.update(changeset)
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
