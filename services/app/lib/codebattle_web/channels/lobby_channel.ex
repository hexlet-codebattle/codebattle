defmodule CodebattleWeb.LobbyChannel do
  @moduledoc false
  use CodebattleWeb, :channel

  alias Codebattle.GameProcess.Play
  alias Codebattle.Tournament
  alias CodebattleWeb.Api.GameView

  def join("lobby", _payload, socket) do
    user_id = socket.assigns.user_id

    {:ok,
     %{
       active_games: GameView.render_active_games(Play.get_active_games(), user_id),
       live_tournaments: Tournament.get_live_tournaments(),
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
end
