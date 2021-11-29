defmodule Codebattle.Game.Supervisor do
  require Logger

  use Supervisor

  alias Codebattle.Game

  def start_link(game) do
    Supervisor.start_link(__MODULE__, game, name: supervisor_name(game.id))
  end

  def init(game) do
    children = [
      {Game.Server, game},
      {Game.TimeoutServer, game.id},
      {Codebattle.Bot.PlayersSupervisor, game.id}
    ]

    chat =
      case game.tournament_id do
        nil -> [{Codebattle.Chat.Server, {:game, game.id}}]
        _ -> []
      end

    Supervisor.init(children ++ chat, strategy: :one_for_one)
  end

  # HELPERS

  defp supervisor_name(game_id), do: {:via, :gproc, supervisor_key(game_id)}
  defp supervisor_key(game_id), do: {:n, :l, {:game_sup, to_string(game_id)}}
end
