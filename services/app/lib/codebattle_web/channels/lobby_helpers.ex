defmodule CodebattleWeb.LobbyHelpers do
  @moduledoc false

  alias Codebattle.GameProcess.{Play, ActiveGames}

  def new_game(game) do
    new_game = %{game.data | state: game.state}
    Task.async(fn ->
      CodebattleWeb.Endpoint.broadcast("lobby", "game:new", %{game: new_game})
    end)
  end

end
