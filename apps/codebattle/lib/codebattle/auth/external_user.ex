defmodule Codebattle.Auth.User.ExternalUser do
  @moduledoc """
    Retrieve user information from externalt oauth request
  """

  alias Codebattle.Repo
  alias Codebattle.User

  @spec find_or_create(map()) :: {:ok, User.t()} | {:error, term()}
  def find_or_create(profile) do
    User
    |> Repo.get_by(external_oauth_id: profile.id)
    |> case do
      nil ->
        name = "External-#{profile.id}"

        params = %{
          external_oauth_id: profile.id,
          name: name,
          subscription_type: :free,
          lang: Application.get_env(:codebattle, :default_lang_slug),
          avatar_url: external_avatar_url(profile)
        }

        %User{}
        |> User.changeset(params)
        |> Repo.insert()

      user ->
        params = %{avatar_url: external_avatar_url(profile)}

        user
        |> User.changeset(params)
        |> Repo.update()
    end
  end

  defp external_avatar_url(%{is_avatar_empty: true}), do: nil

  defp external_avatar_url(profile) do
    :codebattle
    |> Application.get_env(:oauth)
    |> Keyword.get(:external_avatar_url_template)
    |> String.replace(~r/AVATAR_ID/, profile.default_avatar_id)
  end
end
