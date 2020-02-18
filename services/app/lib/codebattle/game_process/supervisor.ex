defmodule Codebattle.GameProcess.Supervisor do
  @moduledoc false

  require Logger

  use Supervisor

  def start_link([game_id, fsm]) do
    Supervisor.start_link(__MODULE__, [game_id, fsm], name: supervisor_name(game_id))
  end

  def init([game_id, fsm]) do
    children = [
      worker(Codebattle.Chat.Server, [game_id]),
      worker(Codebattle.GameProcess.Server, [game_id, fsm]),
      worker(Codebattle.GameProcess.TimeoutServer, [game_id])
      # supervisor(Codebattle.Bot.Supervisor, [game_id])
    ]

    supervise(children, strategy: :one_for_one)
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
