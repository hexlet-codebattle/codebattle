defmodule Codebattle.Tournament.Supervisor do
  use Supervisor

  require Logger

  def start_link(tournament) do
    Supervisor.start_link(__MODULE__, [tournament], name: supervisor_name(tournament.id))
  end

  def init([tournament]) do
    children = [
      %{
        id: "Codebattle.Tournament.Server.#{tournament.id}",
        restart: :transient,
        start: {Codebattle.Tournament.Server, :start_link, [tournament.id]}
      },
      %{
        id: "Codebattle.Chat.Tournament.#{tournament.id}",
        restart: :transient,
        start: {Codebattle.Chat, :start_link, [{:tournament, tournament.id}, %{}]}
      }
    ]

    children =
      if tournament.ranking_type == "by_player_95th_percentile" do
        children ++
          [
            %{
              id: "Codebattle.Tournament.Ranking.UpdateFromResultsServer.#{tournament.id}",
              restart: :transient,
              start:
                {Codebattle.Tournament.Ranking.UpdateFromResultsServer, :start_link, [tournament.id]}
            }
          ]
      else
        children
      end

    Supervisor.init(children, strategy: :one_for_one)
  end

  defp supervisor_name(id), do: {:via, Registry, {Codebattle.Registry, "tournament_sup:#{id}"}}
end
