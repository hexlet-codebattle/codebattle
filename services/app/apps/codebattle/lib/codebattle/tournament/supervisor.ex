defmodule Codebattle.Tournament.Supervisor do
  use Supervisor

  require Logger

  def start_link(tournament_id) do
    Supervisor.start_link(__MODULE__, tournament_id, name: supervisor_name(tournament_id))
  end

  def init(tournament_id) do
    children = [
      %{
        id: "Codebattle.Tournament.Server.#{tournament_id}",
        restart: :transient,
        start: {Codebattle.Tournament.Server, :start_link, [tournament_id]}
      },
      %{
        id: "Codebattle.Chat.Tournament.#{tournament_id}",
        restart: :transient,
        start: {Codebattle.Chat, :start_link, [{:tournament, tournament_id}, %{}]}
      }
    ]

    Supervisor.init(children, strategy: :one_for_one)
  end

  defp supervisor_name(id), do: {:via, Registry, {Codebattle.Registry, "tournament_sup:#{id}"}}
end
