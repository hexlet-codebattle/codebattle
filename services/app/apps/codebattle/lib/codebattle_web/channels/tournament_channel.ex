defmodule CodebattleWeb.TournamentChannel do
  @moduledoc false
  use CodebattleWeb, :channel

  require Logger

  alias Codebattle.Tournament
  alias Codebattle.Tournament.Helpers

  def join("tournament:" <> tournament_id, payload, socket) do
    current_user = socket.assigns.current_user

    user = %{id: current_user.id, name: current_user.name}

    with tournament when not is_nil(tournament) <-
           Tournament.Context.get_tournament_for_user(tournament_id, user),
         true <- Helpers.can_access?(tournament, current_user, payload) do
      if Codebattle.User.admin?(current_user) do
        Codebattle.PubSub.subscribe("tournament:#{tournament_id}")
      else
        Codebattle.PubSub.subscribe("tournament:#{tournament_id}:common")
        Codebattle.PubSub.subscribe("tournament:#{tournament_id}:player:#{current_user.id}")
      end

      {:ok,
       %{
         tournament: tournament
       }, assign(socket, tournament_id: tournament_id, player_id: current_user.id)}
    else
      _ ->
        {:error, %{reason: "not_found"}}
    end
  end

  def handle_in("tournament:join", %{"team_id" => team_id}, socket) do
    tournament_id = socket.assigns.tournament_id

    Tournament.Context.handle_event(tournament_id, :join, %{
      user: socket.assigns.current_user,
      team_id: to_string(team_id)
    })

    {:noreply, socket}
  end

  def handle_in("tournament:join", _, socket) do
    tournament_id = socket.assigns.tournament_id

    Tournament.Context.handle_event(tournament_id, :join, %{
      user: socket.assigns.current_user
    })

    {:noreply, socket}
  end

  def handle_in("tournament:leave", %{"team_id" => team_id}, socket) do
    tournament_id = socket.assigns.tournament_id

    Tournament.Context.handle_event(tournament_id, :leave, %{
      user_id: socket.assigns.current_user.id,
      team_id: to_string(team_id)
    })

    {:noreply, socket}
  end

  def handle_in("tournament:leave", _, socket) do
    tournament_id = socket.assigns.tournament_id

    Tournament.Context.handle_event(tournament_id, :leave, %{
      user_id: socket.assigns.current_user.id
    })

    {:noreply, socket}
  end

  def handle_in("tournament:kick", %{"user_id" => user_id}, socket) do
    tournament_id = socket.assigns.tournament_id
    tournament = Tournament.Server.get_tournament(tournament_id)

    if Tournament.Helpers.can_moderate?(tournament, socket.assigns.current_user) do
      Tournament.Context.handle_event(tournament_id, :leave, %{
        user_id: String.to_integer(user_id)
      })
    end

    {:noreply, socket}
  end

  def handle_in("tournament:restart", _, socket) do
    tournament_id = socket.assigns.tournament_id
    tournament = Tournament.Context.get!(tournament_id)

    if Tournament.Helpers.can_moderate?(tournament, socket.assigns.current_user) do
      Tournament.Context.restart(tournament)

      Tournament.Context.handle_event(tournament_id, :restart, %{
        user: socket.assigns.current_user
      })

      tournament = Tournament.Context.get!(tournament_id)
      broadcast!(socket, "tournament:restarted", %{tournament: tournament})
    end

    {:noreply, socket}

    {:noreply, socket}
  end

  def handle_in("tournament:open_up", _, socket) do
    tournament_id = socket.assigns.tournament_id

    Tournament.Context.handle_event(tournament_id, :open_up, %{
      user: socket.assigns.current_user
    })

    {:noreply, socket}
  end

  def handle_in("tournament:cancel", _, socket) do
    tournament_id = socket.assigns.tournament_id
    tournament = Tournament.Server.get_tournament(tournament_id)

    if Tournament.Helpers.can_moderate?(tournament, socket.assigns.current_user) do
      Tournament.Context.handle_event(tournament_id, :cancel, %{
        user: socket.assigns.current_user
      })
    end

    {:noreply, socket}
  end

  def handle_in("tournament:start", _, socket) do
    tournament_id = socket.assigns.tournament_id
    tournament = Tournament.Server.get_tournament(tournament_id)

    if Tournament.Helpers.can_moderate?(tournament, socket.assigns.current_user) do
      Tournament.Context.handle_event(tournament_id, :start, %{
        user: socket.assigns.current_user
      })
    end

    {:noreply, socket}
  end

  def handle_in("tournament:start_round", _, socket) do
    tournament_id = socket.assigns.tournament_id
    tournament = Tournament.Server.get_tournament(tournament_id)

    if Tournament.Helpers.can_moderate?(tournament, socket.assigns.current_user) do
      Tournament.Context.handle_event(tournament_id, :stop_round_break, %{})
    end

    {:noreply, socket}
  end

  def handle_in("tournament:matches:request", %{"player_id" => id}, socket) do
    tournament_id = socket.assigns.tournament_id
    matches = Tournament.Server.get_matches(tournament_id, [id])

    {:reply, {:ok, %{matches: matches}}, socket}
  end

  # def handle_in("tournament:subscribe_players", %{"player_ids" => player_ids}, socket) do
  #   tournament_id = socket.assigns.tournament_id

  #   Enum.each(player_ids, fn player_id ->
  #     Codebattle.PubSub.subscribe("tournament_player:#{tournament_id}_#{player_id}")
  #   end)

  #   {:reply, {:ok, %{}}, socket}
  # end

  def handle_info(%{event: "tournament:updated", payload: payload}, socket) do
    push(socket, "tournament:update", %{tournament: payload.tournament})

    {:noreply, socket}
  end

  def handle_info(%{event: "tournament:match:created", payload: payload}, socket) do
    push(socket, "tournament:match:created", %{match: payload.match})

    {:noreply, socket}
  end

  def handle_info(%{event: "tournament:round_created", payload: payload}, socket) do
    push(socket, "tournament:round_created", %{
      state: payload.state,
      break_state: payload.break_state
    })

    {:noreply, socket}
  end

  def handle_info(%{event: "tournament:round_finished", payload: payload}, socket) do
    push(socket, "tournament:round_finished", %{
      state: payload.state,
      break_state: payload.break_state,
      players: payload.players
      # top_players: top_players
    })

    {:noreply, socket}
  end

  def handle_info(%{event: "tournament:player:joined", payload: payload}, socket) do
    push(socket, "tournament:player:joined", payload)

    {:noreply, socket}
  end

  def handle_info(%{event: "tournament:player:left", payload: payload}, socket) do
    push(socket, "tournament:player:left", payload)

    {:noreply, socket}
  end

  def handle_info(%{event: "tournament:game:created", payload: payload}, socket) do
    push(socket, "tournament:game:created", %{game_id: payload.game_id})

    {:noreply, socket}
  end

  def handle_info(message, socket) do
    Logger.warning("Unexpected message: " <> inspect(message))
    {:noreply, socket}
  end
end
