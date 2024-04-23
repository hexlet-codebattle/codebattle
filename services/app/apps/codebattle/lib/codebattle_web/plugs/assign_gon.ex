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
      rollbar_api_key: Application.get_env(:codebattle, Codebattle.Plugs)[:rollbar_api_key]
    )
  end

  defp prepare_user(user) do
    user
    |> Map.take([
      :achievements,
      :clan,
      :clan_id,
      :discord_avatar,
      :discord_id,
      :discord_name,
      :editor_mode,
      :editor_theme,
      :games_played,
      :github_id,
      :github_name,
      :id,
      :inserted_at,
      :is_bot,
      :is_guest,
      :lang,
      :name,
      :performance,
      :rank,
      :rating,
      :sound_settings
    ])
    |> Map.put(:is_admin, Codebattle.User.admin?(user))
  end
end
