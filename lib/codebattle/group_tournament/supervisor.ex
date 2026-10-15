defmodule Codebattle.GroupTournament.Supervisor do
  @moduledoc false
  use Supervisor

  def start_link(group_tournament) do
    Supervisor.start_link(__MODULE__, [group_tournament], name: supervisor_name(group_tournament.id))
  end

  @impl true
  def init([group_tournament]) do
    children = [
      %{
        id: "Codebattle.GroupTournament.Server.#{group_tournament.id}",
        restart: :transient,
        start: {Codebattle.GroupTournament.Server, :start_link, [group_tournament.id]}
      }
    ]

    Supervisor.init(children, strategy: :one_for_one)
  end

  defp supervisor_name(id), do: {:via, Registry, {Codebattle.Registry, "group_tournament_sup:#{id}"}}
end
