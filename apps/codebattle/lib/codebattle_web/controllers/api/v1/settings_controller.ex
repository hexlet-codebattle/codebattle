defmodule CodebattleWeb.Api.V1.SettingsController do
  use CodebattleWeb, :controller

  alias Codebattle.Repo
  alias Codebattle.User
  alias Codebattle.UserSession
  alias CodebattleWeb.UserAuth

  plug(CodebattleWeb.Plugs.ApiRequireAuth)

  @password_attempt_limit 5
  @password_attempt_ttl to_timeout(minute: 5)

  def show(conn, _params) do
    current_user = conn.assigns.current_user

    json(conn, %{
      name: current_user.name,
      clan: current_user.clan,
      locale: current_user.locale,
      has_password: User.has_password?(current_user),
      can_unlink_social: User.can_unlink_social?(current_user),
      discord_id: current_user.discord_id,
      discord_name: current_user.discord_name,
      github_id: current_user.github_id,
      github_name: current_user.github_name,
      sound_settings: current_user.sound_settings,
      lang: current_user.lang,
      style_lang: current_user.style_lang,
      db_type: current_user.db_type
    })
  end

  def update(conn, user_params) do
    current_user = conn.assigns.current_user

    current_user
    |> User.settings_changeset(user_params)
    |> Repo.update()
    |> case do
      {:ok, user} ->
        json(conn, %{
          name: user.name,
          clan: user.clan,
          locale: user.locale,
          has_password: User.has_password?(user),
          can_unlink_social: User.can_unlink_social?(user),
          sound_settings: user.sound_settings,
          lang: user.lang,
          style_lang: user.style_lang,
          db_type: user.db_type
        })

      {:error, %Ecto.Changeset{} = changeset} ->
        conn
        |> put_status(:unprocessable_entity)
        |> json(%{errors: translate_errors(changeset)})
    end
  end

  def update_password(conn, params) do
    current_user = conn.assigns.current_user
    current_session = conn.assigns.current_user_session

    if password_rate_limited?(current_user.id) do
      conn
      |> put_status(:too_many_requests)
      |> json(%{errors: %{current_password: ["too many attempts, try again later"]}})
    else
      case User.update_password(
             current_user,
             current_session,
             params,
             UserAuth.session_metadata(conn)
           ) do
        {:ok, _user, session_data} ->
          Cachex.del(:password_attempts_cache, current_user.id)

          conn
          |> UserAuth.put_session_token(session_data.token)
          |> json(%{status: "ok", has_password: true})

        {:error, %Ecto.Changeset{} = changeset} ->
          register_password_failure(current_user.id)

          conn
          |> put_status(:unprocessable_entity)
          |> json(%{errors: translate_errors(changeset)})

        {:error, _reason} ->
          conn
          |> put_status(:unprocessable_entity)
          |> json(%{errors: %{current_password: ["session could not be renewed"]}})
      end
    end
  end

  def sessions(conn, _params) do
    current_session_id = conn.assigns.current_user_session.id

    sessions =
      conn.assigns.current_user.id
      |> UserSession.list_active()
      |> Enum.map(&present_session(&1, current_session_id))

    json(conn, %{sessions: sessions})
  end

  def delete_user_session(conn, %{"id" => session_id}) do
    current_session = conn.assigns.current_user_session

    case UserSession.revoke_for_user(conn.assigns.current_user.id, session_id) do
      {:ok, revoked_session} ->
        current = revoked_session.id == current_session.id

        conn =
          if current do
            conn
            |> clear_session()
            |> configure_session(drop: true)
          else
            conn
          end

        json(conn, %{status: "ok", current: current})

      {:error, :not_found} ->
        conn
        |> put_status(:not_found)
        |> json(%{error: "session not found"})

      {:error, _changeset} ->
        conn
        |> put_status(:unprocessable_entity)
        |> json(%{error: "session could not be revoked"})
    end
  end

  defp password_rate_limited?(user_id) do
    case Cachex.get(:password_attempts_cache, user_id) do
      {:ok, attempts} when is_integer(attempts) -> attempts >= @password_attempt_limit
      _ -> false
    end
  end

  defp register_password_failure(user_id) do
    {:ok, attempts} = Cachex.incr(:password_attempts_cache, user_id)

    if attempts == 1 do
      Cachex.expire(:password_attempts_cache, user_id, @password_attempt_ttl)
    end
  end

  defp present_session(session, current_session_id) do
    %{
      id: session.id,
      current: session.id == current_session_id,
      user_agent: session.user_agent,
      ip: session.ip,
      last_seen_at: session.last_seen_at,
      created_at: session.inserted_at
    }
  end
end
