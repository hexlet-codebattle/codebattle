defmodule CodebattleWeb.LobbyChannel do
  @moduledoc false
  use CodebattleWeb, :channel

  alias Codebattle.GameProcess.Play
  alias Codebattle.GameProcess.Player

  require Logger

  def join("lobby", _payload, socket) do
    active_games =
      Play.active_games()
      |> Enum.map(fn {game_id, players, game_info} ->
        %{game_id: game_id, users: Map.values(players), game_info: game_info}
      end)

    completed_games =
      Enum.map(Play.completed_games(), fn game ->
        winner_user_game =
          game.user_games
          |> Enum.filter(fn user_game -> user_game.result == "won" end)
          |> List.first()

        loser_user_game =
          game.user_games
          |> Enum.filter(fn user_game -> user_game.result != "won" end)
          |> List.first()

        winner = Player.build(winner_user_game)
        loser = Player.build(loser_user_game)

        players =
          [winner, loser]
          |> Enum.sort(&(&1.creator > &2.creator))

        %{
          id: game.id,
          players: players,
          updated_at: game.updated_at,
          duration: game.duration_in_seconds,
          level: game.level
        }
      end)

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
