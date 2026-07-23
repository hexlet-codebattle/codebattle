defmodule CodebattleWeb.UserSocket do
  use Phoenix.Socket

  alias Codebattle.User
  alias Codebattle.UserSession

  ## Channels
  channel("lobby", CodebattleWeb.LobbyChannel)
  channel("tournament:*", CodebattleWeb.TournamentChannel)
  channel("group_tournament:*", CodebattleWeb.GroupTournamentChannel)
  channel("tournament_admin:*", CodebattleWeb.TournamentAdminChannel)
  channel("spectator:*", CodebattleWeb.SpectatorChannel)
  channel("game:*", CodebattleWeb.GameChannel)
  channel("chat:*", CodebattleWeb.ChatChannel)
  channel("main", CodebattleWeb.MainChannel)
  channel("invites", CodebattleWeb.InviteChannel)
  channel("stream:*", CodebattleWeb.TournamentStreamChannel)

  def connect(%{"token" => user_token} = params, socket) do
    guest_id = User.guest_id()
    access_token = normalize_access_token(params["access_token"])

    case Phoenix.Token.verify(socket, "user_token", user_token, max_age: 1_000_000_000) do
      {:ok, ^guest_id} ->
        {:ok, assign(socket, current_user: User.build_guest(), access_token: access_token)}

      {:ok, {user_id, session_id}} ->
        connect_user(socket, user_id, session_id, access_token)

      {:ok, _user_id} ->
        :error

      {:error, _reason} ->
        :error
    end
  end

  def id(%{assigns: %{current_user_session: %{id: session_id}}}), do: "user_session:#{session_id}"
  def id(_socket), do: nil

  defp connect_user(socket, user_id, session_id, access_token) do
    case UserSession.get_active_for_socket(user_id, session_id) do
      %UserSession{user: user} = session ->
        {:ok,
         assign(socket,
           current_user: user,
           current_user_session: session,
           access_token: access_token
         )}

      _ ->
        :error
    end
  end

  defp normalize_access_token(nil), do: nil

  defp normalize_access_token(access_token) when is_binary(access_token) do
    case String.trim(access_token) do
      "" -> nil
      token -> token
    end
  end
end
