defmodule Codebattle.Tournament.Supervisor do
  use Supervisor

  require Logger

  def start_link(tournament) do
    Supervisor.start_link(__MODULE__, tournament, name: supervisor_name(tournament.id))
  end

  def init(tournament) do
    children = [
      {Codebattle.Tournament.Server, tournament},
      %{
        id: "Codebattle.Chat.Tournament.#{tournament.id}",
        start: {Codebattle.Chat, :start_link, [{:tournament, tournament.id}, %{}]}
      }
    ]

    Supervisor.init(children, strategy: :one_for_one)
  end

  # HELPERS

  defp supervisor_name(id), do: {:via, :gproc, supervisor_key(id)}
  defp supervisor_key(id), do: {:n, :l, {:tournament_sup, to_string(id)}}
end
