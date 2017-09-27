defmodule CodebattleWeb.GameChannel do
  @moduledoc false
  use Codebattle.Web, :channel

  require Logger

  alias Codebattle.GameProcess.Play
  alias CodebattleWeb.Presence

  def join("game:" <> game_id, _payload, socket) do
    send(self(), :after_join)
    game_info = Play.game_info(game_id)
    {:ok, game_info, socket}
  end

  def handle_info(:after_join, socket) do
    game_id = get_game_id(socket)
    game_info = Play.game_info(game_id)
    broadcast_from! socket, "user:joined", Map.take(game_info, [:status, :first_player_id, :second_player_id])
    {:noreply, socket}
  end

  def handle_in("ping", payload, socket) do
    {:reply, {:ok, payload}, socket}
  end

  def handle_in("editor:data", payload, socket) do
    data = Map.get(payload, "data")
    game_id = get_game_id(socket)
    Play.update_data(game_id, socket.assigns.user_id, data)
    broadcast_from! socket, "editor:update", %{user_id: socket.assigns.user_id, editor_text: data}
    {:noreply, socket}
  end

  defp get_game_id(socket) do
    "game:" <> game_id = socket.topic
    game_id
  end
end
