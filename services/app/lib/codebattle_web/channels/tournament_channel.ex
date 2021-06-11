defmodule CodebattleWeb.TournamentChannel do
  @moduledoc false
  use CodebattleWeb, :channel

  alias Codebattle.Tournament
  alias Codebattle.Tournament.Helpers

  def join("tournament:" <> tournament_id, _payload, socket) do
    # current_user = socket.assigns.current_user
    tournament = Tournament.Context.get!(tournament_id)
    statistics = Helpers.get_tournament_statistics(tournament)

    Phoenix.PubSub.subscribe(:cb_pubsub, topic_name(tournament))
    Phoenix.PubSub.subscribe(:cb_pubsub, "tournaments")

    {:ok, %{tournament: tournament, statistics: statistics}, socket}
  end

  def handle_info(
        %{topic: "tournament_" <> tournament_id, event: event, payload: payload},
        socket
      ) do
    tournament = payload.tournament
    statistics = Helpers.get_tournament_statistics(tournament)

    broadcast!(socket, event, %{
      tournament: tournament,
      statistics: statistics
    })

    {:noreply, socket}
  end

  def handle_info(
        %{topic: "tournaments", event: event, payload: payload},
        socket
      ) do
    "tournament:" <> tournament_id = socket.topic
    tournament = payload.tournament

    statistics = Helpers.get_tournament_statistics(tournament)

    if tournament_id == tournament.id do
      broadcast!(socket, event, %{
        tournament: tournament,
        statistics: statistics
      })
    end

    {:noreply, socket}
  end

  defp topic_name(tournament) do
    "tournament_#{tournament.id}"
  end
end
