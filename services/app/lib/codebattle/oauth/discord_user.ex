defmodule Codebattle.Oauth.User.DiscordUser do
  @moduledoc """
    Retrieve user information from discord oauth request
  """

  alias Ueberauth.Auth
  alias Codebattle.{Repo, User, UsersActivityServer}

  def find_or_create(%Auth{provider: :discord} = auth) do
    user = User |> Repo.get_by(discord_id: auth.uid)

    discord_name = auth.extra.raw_info.user["username"]
    email = auth.extra.raw_info.user["email"]
    avatar = auth.extra.raw_info.user["avatar"]

    user_data = %{
      discord_id: auth.uid,
      name: name(user, discord_name),
      discord_name: discord_name,
      email: email,
      discord_avatar: avatar
    }

    user =
      case user do
        nil ->
          changeset = User.changeset(%User{}, user_data)
          {:ok, user} = Repo.insert(changeset)

          UsersActivityServer.add_event(%{
            event: "user_is_authorized",
            user_id: user.id,
            data: %{
              provider: "discord"
            }
          })

          user

        _ ->
          changeset = User.changeset(user, user_data)
          {:ok, user} = Repo.update(changeset)

          UsersActivityServer.add_event(%{
            event: "user_is_authenticated",
            user_id: user.id,
            data: %{
              provider: "discord"
            }
          })

          user
      end

    {:ok, user}
  end

  def update(user, auth) do
    discord_user = User |> Repo.get_by(discord_id: auth.uid)

    if discord_user != nil && discord_user.id != user.id do
      {:error, "discord_id has been taken"}
    else
      discord_name = auth.extra.raw_info.user["username"]
      avatar = auth.extra.raw_info.user["avatar"]

      user_data = %{
        discord_id: auth.uid,
        name: name(user, discord_name),
        discord_name: discord_name,
        discord_avatar: avatar
      }

      changeset = User.changeset(user, user_data)
      Repo.update(changeset)
    end
  end

  defp name(user, discord_name) do
    case user do
      nil ->
        case Repo.get_by(User, name: discord_name) do
          %User{} ->
            generate_name(discord_name)

          _ ->
            discord_name
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
end
