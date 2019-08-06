defmodule CodebattleWeb.LobbyChannel do
  @moduledoc false
  use CodebattleWeb, :channel

  alias Codebattle.GameProcess.Play
  alias Codebattle.GameProcess.Player

  require Logger

  def join("lobby", _payload, socket) do
    active_games =
      Play.active_games()
      |> Enum.map(fn {game_id, users, game_info} ->
        %{game_id: game_id, players: Map.values(users), game_info: game_info}
      end)
      |> Enum.filter(fn game -> hd(game.players).id === socket.assigns.user_id or
        game.game_info.type === "public" end)

    completed_games = Enum.map(Play.completed_games(), &Play.get_completed_game_info/1)

    {:ok, %{active_games: active_games, completed_games: completed_games}, socket}
  end

  # TODO_NOW: check this
  def handle_in("game:cancel", payload, socket) do
    game_id = Map.get(payload, "gameId")

    case Play.cancel_game(game_id, socket.assigns.current_user) do
      :ok ->
        broadcast!(socket, "game:cancel", game_id)
        {:noreply, socket}

      {:error, reason} ->
        {:error, %{reason: reason}, socket}
    end
  end
end
