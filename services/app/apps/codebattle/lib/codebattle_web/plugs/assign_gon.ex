defmodule CodebattleWeb.Plugs.AssignGon do
  @moduledoc false

  import PhoenixGon.Controller

  @spec init(Keyword.t()) :: Keyword.t()
  def init(opts), do: opts

  @spec call(Plug.Conn.t(), Keyword.t()) :: Plug.Conn.t()
  def call(conn, _opts) do
    current_user = conn.assigns.current_user

    user_token = Phoenix.Token.sign(conn, "user_token", current_user.id)

    put_gon(conn,
      user_token: user_token,
      current_user: prepare_user(current_user),
      app_version: Application.get_env(:codebattle, :app_version),
      rollbar_api_key: Application.get_env(:codebattle, Codebattle.Plugs)[:rollbar_api_key]
    )
  end

  defp prepare_user(user) do
    user
    |> Map.take([
      :id,
      :name,
      :rating,
      :is_bot,
      :is_guest,
      :github_id,
      :github_name,
      :discord_name,
      :discord_id,
      :discord_avatar,
      :lang,
      :editor_mode,
      :editor_theme,
      :achievements,
      :rank,
      :games_played,
      :performance,
      :inserted_at,
      :sound_settings
    ])
    |> Map.put(:is_admin, Codebattle.User.admin?(user))
  end
end
