defmodule CodebattleWeb.LobbyChannel do
    @moduledoc false
    use Codebattle.Web, :channel

    alias Codebattle.GameProcess.Play
    alias Codebattle.Game

    require Logger

    def join("lobby", _payload, socket) do
        games = Play.list_fsms |> Enum.sort_by(fn (fsm) -> Game.level_difficulties[fsm.data.task.level] end)
        {:ok, %{games: games}, socket}
    end
end
