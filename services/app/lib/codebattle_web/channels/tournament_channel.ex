defmodule CodebattleWeb.TournamentChannel do
  @moduledoc false
  use CodebattleWeb, :channel

  alias Codebattle.Tournament
  alias Codebattle.Tournament.Helpers

  def join("tournament:" <> tournament_id, _payload, socket) do
    tournament = Tournament.Context.get!(tournament_id)
    statistics = Helpers.get_tournament_statistics(tournament)

    Phoenix.PubSub.subscribe(:cb_pubsub, topic_name(tournament))
    Phoenix.PubSub.subscribe(:cb_pubsub, "tournaments")

    {:ok, %{tournament: tournament, statistics: statistics}, socket}
  end

  def handle_in("tournament:join", %{"team_id" => team_id}, socket) do
    tournament_id = get_tournament_id(socket)

    Tournament.Server.update_tournament(tournament_id, :join, %{
      user: socket.assigns.current_user,
      team_id: String.to_integer(team_id)
    })

    {:noreply, socket}
  end

  def handle_in("tournament:join", _, socket) do
    tournament_id = get_tournament_id(socket)

    Tournament.Server.update_tournament(tournament_id, :join, %{
      user: socket.assigns.current_user
    })

    {:noreply, socket}
  end

  def handle_in("tournament:leave", %{"team_id" => team_id}, socket) do
    tournament_id = get_tournament_id(socket)

    Tournament.Server.update_tournament(tournament_id, :leave, %{
      user_id: socket.assigns.current_user.id,
      team_id: String.to_integer(team_id)
    })

    {:noreply, socket}
  end

  def handle_in("tournament:leave", _, socket) do
    tournament_id = get_tournament_id(socket)

    Tournament.Server.update_tournament(tournament_id, :leave, %{
      user_id: socket.assigns.current_user.id
    })

    {:noreply, socket}
  end

  def handle_in("tournament:kick", %{"user_id" => user_id}, socket) do
    tournament_id = get_tournament_id(socket)
    tournament = Tournament.Server.get_tournament(tournament_id)

    if Helpers.is_creator?(tournament, socket.assigns.current_user.id) do
      Tournament.Server.update_tournament(tournament_id, :leave, %{
        user_id: String.to_integer(user_id)
      })
    end

    {:noreply, socket}
  end

  def handle_in("tournament:cancel", _, socket) do
    tournament_id = get_tournament_id(socket)
    tournament = Tournament.Server.get_tournament(tournament_id)

    if Helpers.is_creator?(tournament, socket.assigns.current_user.id) do
      Tournament.Server.update_tournament(tournament_id, :cancel, %{
        user: socket.assigns.current_user
      })

      new_tournament = Tournament.Context.get!(tournament_id)
      statistics = Helpers.get_tournament_statistics(tournament)

      broadcast!(socket, "tournament:update", %{
        tournament: new_tournament,
        statistics: statistics
      })
    end

    {:noreply, socket}
  end

  def handle_in("tournament:start", _, socket) do
    tournament_id = get_tournament_id(socket)

    Tournament.Server.update_tournament(tournament_id, :start, %{
      user: socket.assigns.current_user
    })

    {:noreply, socket}
  end

  def handle_info(
        %{topic: "tournament_" <> _tournament_id, event: event, payload: payload},
        socket
      ) do
    tournament = payload.tournament
    statistics = Helpers.get_tournament_statistics(tournament)

    IO.inspect(event)

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

  defp get_tournament_id(socket) do
    "tournament:" <> tournament_id = socket.topic
    tournament_id
  end
end
