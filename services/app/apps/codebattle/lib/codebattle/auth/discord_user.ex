defmodule Codebattle.Auth.User.DiscordUser do
  @moduledoc """
    Retrieve user information from discord oauth request
  """

  alias Codebattle.Repo
  alias Codebattle.User

  @spec find_or_create(map()) :: {:ok, User.t()} | {:error, term()}
  def find_or_create(profile) do
    User
    |> Repo.get_by(discord_id: profile.id)
    |> case do
      nil ->
        discord_name = profile.username

        params = %{
          discord_id: profile.id,
          discord_avatar: profile.avatar,
          name: unique_name(discord_name),
          discord_name: discord_name,
          email: profile.email,
          avatar_url: get_avatar_url(profile)
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
    discord_user = User |> Repo.get_by(discord_id: profile.id)

    if discord_user != nil && discord_user.id != user.id do
      {:error, "discord_id has been taken"}
    else
      discord_name = profile.username

      params = %{
        discord_id: profile.id,
        discord_name: discord_name,
        discord_avatar: profile.avatar,
        email: profile.email,
        avatar_url: get_avatar_url(profile)
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
    |> User.changeset(%{discord_id: nil, discord_name: nil, discord_avatar: nil})
    |> Repo.update()
  end

  defp unique_name(discord_name) do
    case Repo.get_by(User, name: discord_name) do
      %User{} ->
        generate_unique_name(discord_name)

      _ ->
        discord_name
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

  defp get_avatar_url(profile) do
    if profile.avatar do
      "https://cdn.discordapp.com/avatars/#{profile.id}/#{profile.avatar}.jpg"
    else
      "https://cdn.discordapp.com/embed/avatars/#{Integer.mod(String.to_integer(profile.discriminator), 5)}.png"
    end
  end
end
