defmodule CodebattleWeb.ChatBotChannel do
  @moduledoc false

  use CodebattleWeb, :channel

  require Logger

  def join("chat_bot:" <> _chat_type, _payload, socket) do
    {:ok, %{}, socket}
  end

  def handle_in(_event, _payload, socket) do
    {:noreply, socket}
  end

  def handle_info(_event, _payload, socket) do
    {:noreply, socket}
  end
end
