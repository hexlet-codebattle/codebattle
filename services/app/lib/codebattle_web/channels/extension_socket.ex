defmodule CodebattleWeb.ExtensionSocket do
  use Phoenix.Socket

  require Logger
  alias Codebattle.UsersActivityServer

  ## Channels
  channel("lobby", CodebattleWeb.LobbyChannel)
  channel("main", CodebattleWeb.MainChannel)

  def connect(_params, socket) do
    UsersActivityServer.add_event(%{
      event: "extension_connection",
      user_id: nil
    })

    {:ok, assign(socket, :user_id, "extension")}
  end

  def id(_socket), do: nil
end
