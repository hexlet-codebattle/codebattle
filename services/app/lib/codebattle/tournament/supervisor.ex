defmodule Codebattle.Tournament.Supervisor do
  use Supervisor

  require Logger

  def start_link(tournament) do
    Supervisor.start_link(__MODULE__, tournament, name: supervisor_name(tournament.id))
  end

  def init(tournament) do
    children = [
      worker(Codebattle.Tournament.Server, [tournament]),
      worker(Codebattle.Chat.Server, [{:tournament, tournament.id}])
    ]

    Supervisor.init(children, strategy: :one_for_one)
  end

  # HELPERS
  defp supervisor_name(tournament_id) do
    {:via, :gproc, supervisor_key(tournament_id)}
  end

  defp supervisor_key(tournament_id) do
    {:n, :l, {:tournament_sup, "#{tournament_id}"}}
  end
end
