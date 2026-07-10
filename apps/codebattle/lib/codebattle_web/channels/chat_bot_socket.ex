defmodule CodebattleWeb.ChatBotSocket do
  use Phoenix.Socket

  ## Channels
  channel("chat_bot:*", CodebattleWeb.ChatBotChannel)

  def connect(_params, socket), do: {:ok, socket}

  def id(_socket), do: nil
end
