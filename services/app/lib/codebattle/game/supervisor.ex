defmodule Codebattle.Game.Supervisor do
  require Logger

  use Supervisor

  alias Codebattle.Game.GameHelpers

  def start_link({game_id, fsm}) do
    Supervisor.start_link(__MODULE__, [game_id, fsm], name: supervisor_name(game_id))
  end

  def init([game_id, fsm]) do
    children = [
      {Codebattle.Game.Server, {game_id, fsm}},
      {Codebattle.Game.TimeoutServer, game_id},
      {Codebattle.Bot.PlayersSupervisor, game_id}
    ]

    chat =
      case GameHelpers.get_tournament_id(fsm) do
        nil -> [{Codebattle.Chat.Server, {:game, game_id}}]
        _ -> []
      end

    Supervisor.init(children ++ chat, strategy: :one_for_one)
  end

  def get_pid(game_id) do
    :gproc.where(supervisor_key(game_id))
  end

  # HELPERS
  defp supervisor_name(game_id) do
    {:via, :gproc, supervisor_key(game_id)}
  end

  defp supervisor_key(game_id) do
    {:n, :l, {:game_supervisor, "#{game_id}"}}
  end
end
