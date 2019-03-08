defmodule CodebattleWeb.LobbyChannel do
  @moduledoc false
  use CodebattleWeb, :channel

  alias Codebattle.GameProcess.Play

  require Logger

  def join("lobby", _payload, socket) do

    active_games =
      Play.list_games()
      |> Enum.map(fn {game_id, users, game_info} ->
        %{game_id: game_id, users: Map.values(users), game_info: game_info}
      end)

    completed_games = Play.completed_games()

    {:ok, %{active_games: active_games, completed_games: completed_games}, socket}
  end
end
