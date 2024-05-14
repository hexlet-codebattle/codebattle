defmodule CodebattleWeb.UserSocket do
  use Phoenix.Socket

  require Logger
  alias Codebattle.User
  ## Channels
  channel("lobby", CodebattleWeb.LobbyChannel)
  channel("tournament:*", CodebattleWeb.TournamentChannel)
  channel("tournament_admin:*", CodebattleWeb.TournamentAdminChannel)
  channel("spectator:*", CodebattleWeb.SpectatorChannel)
  channel("game:*", CodebattleWeb.GameChannel)
  channel("chat:*", CodebattleWeb.ChatChannel)
  channel("main", CodebattleWeb.MainChannel)
  channel("invites", CodebattleWeb.InviteChannel)

  def connect(%{"token" => user_token}, socket) do
    guest_id = User.guest_id()

    case Phoenix.Token.verify(socket, "user_token", user_token, max_age: 1_000_00000) do
      {:ok, ^guest_id} ->
        {:ok, assign(socket, current_user: User.build_guest())}

      {:ok, user_id} ->
        {:ok, assign(socket, :current_user, User.get!(user_id))}

      {:error, _reason} ->
        :error
    end
  end

  def id(_socket), do: nil
end
