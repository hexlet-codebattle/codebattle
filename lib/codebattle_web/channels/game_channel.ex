defmodule CodebattleWeb.GameChannel do
  @moduledoc false
  use Codebattle.Web, :channel

  require Logger

  alias Codebattle.GameProcess.Play
  # alias CodebattleWeb.Presence

  def join("game:" <> game_id, _payload, socket) do
    send(self(), :after_join)
    game_info = Play.game_info(game_id)

    {:ok, game_info, socket}
  end

  def handle_info(:after_join, socket) do
    game_id = get_game_id(socket)
    game_info = Play.game_info(game_id)
    broadcast_from! socket, "user:joined", Map.take(game_info, [:status, :winner, :first_player, :second_player])
    {:noreply, socket}
  end

  def handle_in("ping", payload, socket) do
    {:reply, {:ok, payload}, socket}
  end

  def handle_in("editor:data", payload, socket) do
    editor_text = Map.get(payload, "editor_text")
    game_id = get_game_id(socket)
    Play.update_editor_text(game_id, socket.assigns.user_id, editor_text)
    broadcast_from! socket, "editor:update", %{user_id: socket.assigns.user_id, editor_text: editor_text}
    {:noreply, socket}
  end

  def handle_in("check_result", payload, socket) do
    editor_text = Map.get(payload, "editor_text")
    game_id = get_game_id(socket)
    Play.update_editor_text(game_id, socket.assigns.user_id, editor_text)
    case Play.check_game(game_id, socket.assigns.current_user, editor_text) do
    {:ok, fsm} ->
      winner = fsm.data.winner
      msg = case fsm.state do
        :player_won ->
            message = winner.name <> " " <> gettext("won the game!")
            broadcast_from! socket, "user:won", %{winner: winner, status: "player_won", msg: message}
            message
        _ ->
            gettext "You lose the game"
      end
      {:reply, {:ok, %{status: fsm.state, msg: msg, winner: winner}}, socket}

    {:error, reason} ->
      {:reply, {:ok, %{error: true, reason: reason}}, socket}
    end
  end

  defp get_game_id(socket) do
    "game:" <> game_id = socket.topic
    game_id
  end
end
