defmodule Codebattle.Oauth.User.FirebaseUser do
  @moduledoc """
    Basic user/password registration
  """

  alias Codebattle.{Repo, User, UsersActivityServer}

  def find(auth) do
    user = User |> Repo.get_by(firebase_uid: auth.uid)

    case user do
      nil ->
        UsersActivityServer.add_event(%{
          event: "user_is_not_authorized",
          user_id: nil,
          data: %{
            provider: "firebase"
          }
        })

        {:error, "User is not authorized"}

      _ ->
        UsersActivityServer.add_event(%{
          event: "user_is_authenticated",
          user_id: user.id,
          data: %{
            provider: "firebase"
          }
        })

        {:ok, user}
    end
  end

  def create(auth) do
    user_by_email = User |> Repo.get_by(email: auth.email)
    user_by_name = User |> Repo.get_by(name: auth.name)

    user_data = %{
      name: auth.name,
      email: auth.email,
      firebase_uid: auth.uid
    }

    case {user_by_name, user_by_email} do
      {nil, nil} ->
        changeset = User.changeset(%User{}, user_data)
        {:ok, user} = Repo.insert(changeset)

        UsersActivityServer.add_event(%{
          event: "user_is_authorized",
          user_id: user.id,
          data: %{
            provider: "firebase"
          }
        })

        {:ok, user}

      {%User{}, _} ->
        UsersActivityServer.add_event(%{
          event: "name_already_taken",
          user_id: nil,
          data: %{
            provider: "firebase"
          }
        })

        {:error, "Nickname already taken"}

      {_, %User{}} ->
        UsersActivityServer.add_event(%{
          event: "email_already_taken",
          user_id: nil,
          data: %{
            provider: "firebase"
          }
        })

        {:error, "Email already taken"}
    end
  end
end
