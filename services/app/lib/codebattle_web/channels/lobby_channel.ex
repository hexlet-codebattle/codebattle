defmodule CodebattleWeb.LobbyChannel do
  @moduledoc false
  use CodebattleWeb, :channel

  alias Codebattle.Game
  alias Codebattle.Tournament
  alias CodebattleWeb.Api.GameView

  def join("lobby", _payload, socket) do
    current_user = socket.assigns.current_user

    {:ok,
     %{
       live_games: GameView.render_live_games(Game.Context.get_live_games(), current_user.id),
       tournaments: Tournament.Context.list_live_and_finished(socket.assigns.current_user),
       completed_games: GameView.render_completed_games(Game.Context.get_completed_games())
     }, socket}
  end

  def handle_in("game:cancel", payload, socket) do
    game_id = Map.get(payload, "gameId")

    case Game.Context.cancel_game(game_id, socket.assigns.current_user) do
      :ok ->
        CodebattleWeb.Notifications.remove_active_game(game_id)
        {:noreply, socket}

      {:error, reason} ->
        {:error, %{reason: reason}, socket}
    end
  end

  def handle_in("game:create", payload, socket) do
    game_params = %{
      level: payload["level"],
      type: payload["type"],
      visibility_type: payload["visibility_type"],
      timeout_seconds: payload["timeout_seconds"],
      players: [socket.assigns.current_user]
    }

    case Game.Context.create_game(game_params) do
      {:ok, game} ->
        {:reply, {:ok, %{game_id: game.id}}, socket}

      {:error, reason} ->
        {:reply, {:error, %{reason: reason}}, socket}
    end
  end
end
