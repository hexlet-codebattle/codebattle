defmodule CodebattleWeb.Plugs.AssignInertiaProps do
  @moduledoc false

  import Inertia.Controller

  alias Codebattle.UserSession

  @spec init(Keyword.t()) :: Keyword.t()
  def init(opts), do: opts

  @spec call(Plug.Conn.t(), Keyword.t()) :: Plug.Conn.t()
  def call(conn, _opts) do
    current_user = conn.assigns.current_user
    current_season = Codebattle.Season.get_current_season()

    props = %{
      "current_season" => present_season(current_season),
      "current_user" => present_user(current_user, conn.request_path),
      "user_sessions" =>
        present_user_sessions(
          current_user,
          conn.assigns.current_user_session,
          conn.request_path
        ),
      "locale" => Gettext.get_locale(CodebattleWeb.Gettext),
      "user_token" =>
        Phoenix.Token.sign(
          conn,
          "user_token",
          socket_token_payload(current_user, conn.assigns.current_user_session)
        )
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

  defp socket_token_payload(%{is_guest: true} = user, nil), do: user.id
  defp socket_token_payload(user, session), do: {user.id, session.id}

  defp present_user_sessions(%{is_guest: true}, _current_session, _request_path), do: []
  defp present_user_sessions(_user, _current_session, request_path) when request_path != "/settings", do: []

  defp present_user_sessions(user, current_session, "/settings") do
    user.id
    |> UserSession.list_active()
    |> Enum.map(fn session ->
      %{
        id: session.id,
        current: session.id == current_session.id,
        user_agent: session.user_agent,
        ip: session.ip,
        last_seen_at: session.last_seen_at,
        created_at: session.inserted_at
      }
    end)
  end

  defp present_user(user, request_path) do
    presented_user =
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
      |> Map.put(:has_password, Codebattle.User.has_password?(user))
      |> Map.put(:is_admin, Codebattle.User.admin?(user))

    if request_path == "/settings" do
      presented_user
      |> Map.put(:email, user.email)
      |> Map.put(:has_firebase_auth, present?(user.firebase_uid))
    else
      presented_user
    end
  end

  defp present?(value), do: not is_nil(value) and value != ""
end
