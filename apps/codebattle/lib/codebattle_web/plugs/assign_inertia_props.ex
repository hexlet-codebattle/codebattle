defmodule CodebattleWeb.Plugs.AssignInertiaProps do
  @moduledoc false

  import Inertia.Controller

  @spec init(Keyword.t()) :: Keyword.t()
  def init(opts), do: opts

  @spec call(Plug.Conn.t(), Keyword.t()) :: Plug.Conn.t()
  def call(conn, _opts) do
    current_user = conn.assigns.current_user
    current_season = Codebattle.Season.get_current_season()

    props = %{
      "current_season" => present_season(current_season),
      "current_user" => present_user(current_user),
      "locale" => Gettext.get_locale(CodebattleWeb.Gettext),
      "user_token" => Phoenix.Token.sign(conn, "user_token", current_user.id)
    }

    conn
    |> then(fn conn -> Enum.reduce(props, conn, fn {key, value}, conn -> assign_prop(conn, key, value) end) end)
    |> Plug.Conn.assign(:frontend_shared_props, props)
    |> Plug.Conn.assign(:ticker_text, nil)
  end

  defp present_season(nil), do: nil

  defp present_season(season) do
    Map.take(season, [:name, :year, :starts_at, :ends_at])
  end

  defp present_user(user) do
    user
    |> Map.take([
      :avatar_url,
      :can_unlink_social,
      :clan,
      :clan_id,
      :discord_avatar,
      :discord_id,
      :discord_name,
      :editor_mode,
      :editor_theme,
      :external_oauth_login,
      :external_platform_id,
      :external_platform_login,
      :games_played,
      :github_id,
      :github_name,
      :id,
      :inserted_at,
      :is_bot,
      :is_guest,
      :category,
      :lang,
      :style_lang,
      :db_type,
      :locale,
      :name,
      :performance,
      :points,
      :rank,
      :rating,
      :subscription_type,
      :sound_settings
    ])
    |> Map.put(:can_unlink_social, Codebattle.User.can_unlink_social?(user))
    |> Map.put(:is_admin, Codebattle.User.admin?(user))
  end
end
