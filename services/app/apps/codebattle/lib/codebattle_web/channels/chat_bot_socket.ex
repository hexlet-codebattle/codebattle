defmodule CodebattleWeb.ChatBotSocket do
  use Phoenix.Socket

  require Logger

  ## Channels
  channel("chat_bot:*", CodebattleWeb.ChatBotChannel)

  def connect(%{"user_token" => chat_bot_token}, socket) do
    Logger.debug("Codebattle bot try to connect")

    case Phoenix.Token.verify(socket, "chat_bot_token", chat_bot_token, max_age: 1_000_000) do
      {:ok, _} ->
        Logger.debug("Codebattle bot connected")
        {:ok, socket}

      {:error, _reason} ->
        Logger.error("Codebattle bot doesn't connected")
        :error
    end
  end

  def id(_socket), do: nil
end
