defmodule CodebattleWeb.LobbyChannel do
  @moduledoc false
  use CodebattleWeb, :channel

  alias Codebattle.Game.GameHelpers
  alias Codebattle.Game.Play
  alias Codebattle.Tournament
  alias CodebattleWeb.Api.GameView

  def join("lobby", _payload, socket) do
    current_user = socket.assigns.current_user

    {:ok,
     %{
       active_games: GameView.render_active_games(Play.get_active_games(), current_user.id),
       tournaments: Tournament.Context.list_live_and_finished(socket.assigns.current_user),
       completed_games: GameView.render_completed_games(Play.get_completed_games())
     }, socket}
  end

  def handle_in("game:cancel", payload, socket) do
    game_id = Map.get(payload, "gameId")

    case Play.cancel_game(game_id, socket.assigns.current_user) do
      :ok ->
        CodebattleWeb.Notifications.remove_active_game(game_id)
        {:noreply, socket}

      {:error, reason} ->
        {:error, %{reason: reason}, socket}
    end
  end

  def handle_in("game:create", payload, socket) do
    type =
      case payload["type"] do
        "withFriend" -> "private"
        "withRandomPlayer" -> "public"
        type -> type
      end

    user = socket.assigns.current_user

    game_params = %{
      level: payload["level"],
      type: type,
      timeout_seconds: payload["timeout_seconds"],
      user: user
    }

    case Play.start_game(game_params) do
      {:ok, fsm} ->
        game_id = GameHelpers.get_game_id(fsm)
        {:reply, {:ok, %{game_id: game_id}}, socket}

      {:error, reason} ->
        {:reply, {:error, %{reason: reason}}, socket}
    end
  end
end
