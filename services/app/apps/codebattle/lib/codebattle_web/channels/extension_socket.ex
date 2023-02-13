defmodule CodebattleWeb.ExtensionSocket do
  use Phoenix.Socket

  require Logger

  ## Channels
  channel("lobby", CodebattleWeb.LobbyChannel)
  channel("main", CodebattleWeb.MainChannel)

  def connect(_params, socket) do
    # TODO: add auth for extension by token, now it works only like anonymous user
    {:ok, assign(socket, :current_user, Codebattle.User.create_guest())}
  end

  def id(_socket), do: nil
end
