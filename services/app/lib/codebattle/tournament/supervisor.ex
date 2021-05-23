defmodule Codebattle.Tournament.Supervisor do
  use Supervisor

  require Logger

  def start_link(tournament) do
    Supervisor.start_link(__MODULE__, tournament, name: supervisor_name(tournament.id))
  end

  def init(tournament) do
    children = [
      {Codebattle.Tournament.Server, tournament},
      {Codebattle.Chat.Server, {:tournament, tournament.id}}
    ]

    Supervisor.init(children, strategy: :one_for_one)
  end

  def get_pid(id) do
    :gproc.where(supervisor_key(id))
  end

  # HELPERS
  defp supervisor_name(tournament_id) do
    {:via, :gproc, supervisor_key(tournament_id)}
  end

  defp supervisor_key(tournament_id) do
    {:n, :l, {:tournament_sup, "#{tournament_id}"}}
  end
end
