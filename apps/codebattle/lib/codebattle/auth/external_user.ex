defmodule Codebattle.Auth.User.ExternalUser do
  @moduledoc """
    Retrieve user information from externalt oauth request
  """

  alias Codebattle.Repo
  alias Codebattle.User

  @spec find_or_create(map()) :: {:ok, User.t()} | {:error, term()}
  def find_or_create(profile) do
    external_platform_user = Codebattle.ExternalPlatform.get_user_by_login(profile.login)
    name = "External-#{profile.id}"

    params = %{
      external_oauth_id: profile.id,
      external_oauth_login: profile.login,
      external_platform_id: external_platform_id(external_platform_user),
      external_platform_login: external_platform_login(external_platform_user),
      name: name,
      subscription_type: :free,
      lang: Application.get_env(:codebattle, :default_lang_slug),
      avatar_url: external_avatar_url(profile)
    }

    %User{}
    |> User.changeset(params)
    |> Repo.insert(
      on_conflict: [
        set: [
          avatar_url: params.avatar_url,
          external_oauth_login: params.external_oauth_login,
          external_platform_id: params.external_platform_id,
          external_platform_login: params.external_platform_login,
          updated_at: DateTime.utc_now(:second)
        ]
      ],
      conflict_target: :external_oauth_id,
      returning: true
    )
  end

  defp external_avatar_url(%{is_avatar_empty: true}), do: nil

  defp external_avatar_url(profile) do
    :codebattle
    |> Application.get_env(:oauth)
    |> Keyword.get(:external_avatar_url_template)
    |> String.replace(~r/AVATAR_ID/, profile.default_avatar_id)
  end

  defp external_platform_id(%{id: id}), do: id
  defp external_platform_id(_), do: nil

  defp external_platform_login(%{login: login}), do: login
  defp external_platform_login(_), do: nil
end
