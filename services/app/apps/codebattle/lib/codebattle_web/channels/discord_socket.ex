defmodule CodebattleWeb.DiscordSocket do
  use Phoenix.Socket

  require Logger

  ## Channels
  channel("lobby", CodebattleWeb.LobbyChannel)
  channel("game:*", CodebattleWeb.GameChannel)
  channel("chat:*", CodebattleWeb.ChatChannel)

  def connect(_params, socket) do
    Logger.info("Discord bot try to connect")
    {:ok, assign(socket, :user_id, "discord-bot")}
  end

  def id(_socket), do: nil
end
