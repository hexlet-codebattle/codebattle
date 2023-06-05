defmodule CodebattleWeb.TournamentChannel do
  @moduledoc false
  use CodebattleWeb, :channel

  alias Codebattle.Tournament
  alias Codebattle.Tournament.Helpers

  def join("tournament:" <> tournament_id, payload, socket) do
    current_user = socket.assigns.current_user

    with tournament when not is_nil(tournament) <- Tournament.Context.get(tournament_id),
         true <- Tournament.Helpers.can_access?(tournament, current_user, payload) do
      active_match = Helpers.get_active_match(tournament, current_user)
      Codebattle.PubSub.subscribe(topic_name(tournament))

      {:ok,
       %{
         active_match: active_match,
         tournament: tournament
       }, assign(socket, :tournament_id, tournament_id)}
    else
      _ ->
        {:error, %{reason: "not_found"}}
    end
  end

  def handle_in("tournament:join", %{"team_id" => team_id}, socket) do
    tournament_id = socket.assigns.tournament_id

    Tournament.Context.send_event(tournament_id, :join, %{
      user: socket.assigns.current_user,
      team_id: String.to_integer(team_id)
    })

    {:noreply, socket}
  end

  def handle_in("tournament:join", _, socket) do
    tournament_id = socket.assigns.tournament_id

    Tournament.Context.send_event(tournament_id, :join, %{
      user: socket.assigns.current_user
    })

    {:noreply, socket}
  end

  def handle_in("tournament:leave", %{"team_id" => team_id}, socket) do
    tournament_id = socket.assigns.tournament_id

    Tournament.Context.send_event(tournament_id, :leave, %{
      user_id: socket.assigns.current_user.id,
      team_id: String.to_integer(team_id)
    })

    {:noreply, socket}
  end

  def handle_in("tournament:leave", _, socket) do
    tournament_id = socket.assigns.tournament_id

    Tournament.Context.send_event(tournament_id, :leave, %{
      user_id: socket.assigns.current_user.id
    })

    {:noreply, socket}
  end

  def handle_in("tournament:kick", %{"user_id" => user_id}, socket) do
    tournament_id = socket.assigns.tournament_id
    tournament = Tournament.Server.get_tournament(tournament_id)

    if Helpers.is_creator?(tournament, socket.assigns.current_user.id) do
      Tournament.Context.send_event(tournament_id, :leave, %{
        user_id: String.to_integer(user_id)
      })
    end

    {:noreply, socket}
  end

  def handle_in("tournament:cancel", _, socket) do
    tournament_id = socket.assigns.tournament_id
    tournament = Tournament.Server.get_tournament(tournament_id)

    if Helpers.is_creator?(tournament, socket.assigns.current_user.id) do
      Tournament.Context.send_event(tournament_id, :cancel, %{
        user: socket.assigns.current_user
      })
    end

    {:noreply, socket}
  end

  def handle_in("tournament:start", _, socket) do
    tournament_id = socket.assigns.tournament_id

    Tournament.Context.send_event(tournament_id, :start, %{
      user: socket.assigns.current_user
    })

    {:noreply, socket}
  end

  defp topic_name(tournament), do: "tournament:#{tournament.id}"
end
