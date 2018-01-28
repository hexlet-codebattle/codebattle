defmodule Codebattle.GameProcess.Supervisor do
  @moduledoc false

  use Supervisor

  alias Codebattle.GameProcess.Server

  def start_link(game_id, fsm) do
    Supervisor.start_link(__MODULE__, [game_id, fsm], name: game_name(game_id))
  end

  def init([game_id, fsm]) do
    children = [
      worker(Codebattle.Chat.Server, [game_id]),
      worker(Codebattle.GameProcess.Server, [game_id, fsm])
      # TODO: enable record server
      # worker(RecorderServer, [game.id, user.id])
    ]

    supervise(children, strategy: :one_for_one)
  end

  defp game_state({_id, pid, _type, _modules}) do
    pid
    |> GenServer.call(:fsm)
  end

  # HELPERS
  defp game_name(game_id) do
    {:via, :gproc, game_key(game_id)}
  end

  defp game_key(game_id) do
    {:n, :l, {:game_supervisor, to_charlist(game_id)}}
  end
end
