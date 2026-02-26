defmodule CodebattleWeb.UserSocket do
  use Phoenix.Socket

  alias Codebattle.User

  require Logger

  ## Channels
  channel("lobby", CodebattleWeb.LobbyChannel)
  channel("tournament:*", CodebattleWeb.TournamentChannel)
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

      {:ok, user_id} ->
        {:ok, assign(socket, current_user: User.get!(user_id), access_token: access_token)}

      {:error, _reason} ->
        :error
    end
  end

  def id(_socket), do: nil

  defp normalize_access_token(nil), do: nil

  defp normalize_access_token(access_token) when is_binary(access_token) do
    case String.trim(access_token) do
      "" -> nil
      token -> token
    end
  end
end
