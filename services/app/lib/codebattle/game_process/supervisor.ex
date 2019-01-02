defmodule Codebattle.GameProcess.Supervisor do
  @moduledoc false

  use Supervisor

  def start_link(game_id, fsm) do
    Supervisor.start_link(__MODULE__, [game_id, fsm], name: game_name(game_id))
  end

  def init([game_id, fsm]) do
    children = [
      worker(Codebattle.Chat.Server, [game_id]),
      worker(Codebattle.GameProcess.Server, [game_id, fsm]),
      # worker(RecorderServer, [game_id, user.id])
    ]

    supervise(children, strategy: :one_for_one)
  end

  # HELPERS
  defp game_name(game_id) do
    {:via, :gproc, game_key(game_id)}
  end

  defp game_key(game_id) do
    {:n, :l, {:game_supervisor, to_charlist(game_id)}}
  end
end
