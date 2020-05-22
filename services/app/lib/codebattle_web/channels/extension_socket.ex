defmodule CodebattleWeb.ExtensionSocket do
  use Phoenix.Socket

  require Logger
  ## Channels
  channel("lobby", CodebattleWeb.LobbyChannel)

  def connect(_params, socket) do
    {:ok, assign(socket, :user_id, "extension")}
  end

  def id(_socket), do: nil
end
