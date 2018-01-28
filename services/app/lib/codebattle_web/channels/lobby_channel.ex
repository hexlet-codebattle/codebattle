defmodule CodebattleWeb.LobbyChannel do
  @moduledoc false
  use CodebattleWeb, :channel

  alias Codebattle.GameProcess.Play
  alias Codebattle.Game

  require Logger

  def join("lobby", _payload, socket) do
    games =
      Play.list_games()
      |> Enum.map(fn {game_id, users, game_info} ->
        %{game_id: game_id, users: Map.values(users), game_info: game_info}
      end)

    # |> Enum.sort_by(fn (game) -> Game.level_difficulties[game.data.task.level] end)
    #
    {:ok, %{games: games}, socket}
  end
end
