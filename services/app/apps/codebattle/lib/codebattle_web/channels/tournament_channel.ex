defmodule CodebattleWeb.TournamentChannel do
  @moduledoc false
  use CodebattleWeb, :channel

  require Logger

  alias Codebattle.Tournament
  alias Codebattle.Tournament.Helpers

  def join("tournament:" <> tournament_id, payload, socket) do
    current_user = socket.assigns.current_user

    with tournament when not is_nil(tournament) <-
           Tournament.Context.get_tournament_info(tournament_id),
         true <- Helpers.can_access?(tournament, current_user, payload) do
      mark_player_as_online(tournament, current_user)

      payload =
        tournament
        |> subscribe_on_tournament_events(socket)
        |> get_tournament_join_payload(socket)

      {:ok, payload,
       assign(socket,
         tournament_info:
           Map.take(tournament, [:id, :players_table, :matches_table, :tasks_table])
       )}
    else
      _ ->
        {:error, %{reason: "not_found"}}
    end
  end

  def handle_in("tournament:join", %{"team_id" => team_id}, socket) do
    tournament_id = socket.assigns.tournament_info.id

    Tournament.Context.handle_event(tournament_id, :join, %{
      user: socket.assigns.current_user,
      team_id: to_string(team_id)
    })

    {:noreply, socket}
  end

  def handle_in("tournament:join", _, socket) do
    tournament_id = socket.assigns.tournament_info.id

    Tournament.Context.handle_event(tournament_id, :join, %{
      user: socket.assigns.current_user
    })

    {:noreply, socket}
  end

  def handle_in("tournament:leave", %{"team_id" => team_id}, socket) do
    tournament_id = socket.assigns.tournament_info.id

    Tournament.Context.handle_event(tournament_id, :leave, %{
      user_id: socket.assigns.current_user.id,
      team_id: to_string(team_id)
    })

    {:noreply, socket}
  end

  def handle_in("tournament:leave", _, socket) do
    tournament_id = socket.assigns.tournament_info.id

    Tournament.Context.handle_event(tournament_id, :leave, %{
      user_id: socket.assigns.current_user.id
    })

    {:noreply, socket}
  end

  def handle_in("tournament:kick", %{"user_id" => user_id}, socket) do
    tournament_id = socket.assigns.tournament_info.id
    tournament = Tournament.Server.get_tournament(tournament_id)

    if Helpers.can_moderate?(tournament, socket.assigns.current_user) do
      Tournament.Context.handle_event(tournament_id, :leave, %{
        user_id: user_id
      })
    end

    {:noreply, socket}
  end

  def handle_in("tournament:ban:player", %{"user_id" => user_id}, socket) do
    tournament_id = socket.assigns.tournament_info.id
    tournament = Tournament.Server.get_tournament(tournament_id)

    if Helpers.can_moderate?(tournament, socket.assigns.current_user) do
      Tournament.Context.handle_event(tournament_id, :ban_player, %{
        user_id: user_id
      })
    end

    {:reply, {:ok, :banned}, socket}
  end

  def handle_in("tournament:restart", _, socket) do
    tournament_id = socket.assigns.tournament_info.id
    tournament = Tournament.Context.get!(tournament_id)

    if Helpers.can_moderate?(tournament, socket.assigns.current_user) do
      Tournament.Context.restart(tournament)

      Tournament.Context.handle_event(tournament_id, :restart, %{
        user: socket.assigns.current_user
      })

      tournament = Tournament.Context.get_tournament_info(tournament_id)

      if tournament do
        broadcast!(socket, "tournament:restarted", %{
          tournament: Map.drop(tournament, [:players_table, :matches_table, :tasks_table])
        })
      end
    end

    {:noreply, socket}
  end

  def handle_in("tournament:open_up", _, socket) do
    tournament_id = socket.assigns.tournament_info.id

    Tournament.Context.handle_event(tournament_id, :open_up, %{
      user: socket.assigns.current_user
    })

    {:noreply, socket}
  end

  def handle_in("tournament:toggle_show_results", _, socket) do
    tournament_id = socket.assigns.tournament_info.id

    Tournament.Context.handle_event(tournament_id, :toggle_show_results, %{
      user: socket.assigns.current_user
    })

    tournament = Tournament.Context.get_tournament_info(tournament_id)

    broadcast!(socket, "tournament:update", %{
      tournament: %{
        show_results: Map.get(tournament, :show_results, false)
      }
    })

    {:noreply, socket}
  end

  def handle_in("tournament:cancel", _, socket) do
    tournament_id = socket.assigns.tournament_info.id
    tournament = Tournament.Server.get_tournament(tournament_id)

    if Helpers.can_moderate?(tournament, socket.assigns.current_user) do
      Tournament.Context.handle_event(tournament_id, :cancel, %{
        user: socket.assigns.current_user
      })

      tournament = Tournament.Context.get_tournament_info(tournament_id)

      broadcast!(socket, "tournament:update", %{tournament: tournament})
    end

    {:noreply, socket}
  end

  def handle_in("tournament:start", _, socket) do
    tournament_id = socket.assigns.tournament_info.id
    tournament = Tournament.Server.get_tournament(tournament_id)

    if Helpers.can_moderate?(tournament, socket.assigns.current_user) do
      Tournament.Context.handle_event(tournament_id, :start, %{
        user: socket.assigns.current_user
      })
    end

    {:noreply, socket}
  end

  def handle_in("tournament:start_round", _, socket) do
    tournament_id = socket.assigns.tournament_info.id
    tournament = Tournament.Server.get_tournament(tournament_id)

    if Helpers.can_moderate?(tournament, socket.assigns.current_user) do
      Tournament.Context.handle_event(tournament_id, :stop_round_break, %{})
    end

    {:noreply, socket}
  end

  def handle_in("tournament:create_match", %{"user_id" => user_id, "level" => level}, socket) do
    tournament_id = socket.assigns.tournament_info.id
    tournament = Tournament.Server.get_tournament(tournament_id)

    if Helpers.can_moderate?(tournament, socket.assigns.current_user) do
      Tournament.Context.handle_event(tournament_id, :create_match, %{
        user_id: user_id,
        level: level
      })
    end

    {:noreply, socket}
  end

  def handle_in("tournament:finish_round", _, socket) do
    tournament_id = socket.assigns.tournament_info.id
    tournament = Tournament.Server.get_tournament(tournament_id)

    if Helpers.can_moderate?(tournament, socket.assigns.current_user) do
      Tournament.Context.handle_event(tournament_id, :finish_round, %{})
    end

    {:noreply, socket}
  end

  def handle_in("tournament:players:request", %{"player_ids" => player_ids}, socket) do
    tournament_info = socket.assigns.tournament_info
    players = Helpers.get_players(tournament_info, player_ids)

    {:reply, {:ok, %{players: players}}, socket}
  end

  def handle_in("tournament:matches:request", %{"player_id" => id}, socket) do
    tournament_info = socket.assigns.tournament_info
    matches = Helpers.get_matches_by_players(tournament_info, [id])

    opponent_ids =
      matches
      |> Enum.flat_map(& &1.player_ids)
      |> Enum.reject(&(is_nil(&1) || id === &1))
      |> Enum.uniq()

    opponents = Helpers.get_players(tournament_info, opponent_ids)

    {:reply, {:ok, %{matches: matches, players: opponents}}, socket}
  end

  def handle_in(
        "tournament:players:paginated",
        %{"page_num" => page_num, "page_size" => page_size},
        socket
      ) do
    tournament_info = socket.assigns.tournament_info

    players =
      Helpers.get_paginated_players(tournament_info, min(page_num, 1000), min(page_size, 30))

    {:reply, {:ok, %{players: players, top_player_ids: players}}, socket}
  end

  def handle_info(%{event: "tournament:updated", payload: payload}, socket) do
    matches =
      if payload.tournament.type in ["swiss", "ladder"] do
        []
      else
        Helpers.get_matches(payload.tournament)
      end

    push(socket, "tournament:update", %{
      tournament:
        Map.drop(payload.tournament, [
          :__struct__,
          :__meta__,
          :creator,
          :players,
          :matches,
          :players_table,
          :matches_table,
          :tasks_table,
          :round_tasks,
          :played_pair_ids
        ]),
      players: Helpers.get_top_players(payload.tournament),
      matches: matches
    })

    {:noreply, socket}
  end

  def handle_info(%{event: "tournament:match:upserted", payload: payload}, socket) do
    push(socket, "tournament:match:upserted", %{match: payload.match, players: payload.players})

    {:noreply, socket}
  end

  def handle_info(%{event: "tournament:round_created", payload: payload}, socket) do
    push(socket, "tournament:round_created", %{tournament: payload.tournament})

    {:noreply, socket}
  end

  def handle_info(%{event: "tournament:round_finished", payload: payload}, socket) do
    push(socket, "tournament:round_finished", %{
      tournament: payload.tournament,
      players: payload.players,
      top_player_ids: Enum.map(payload.players || [], & &1.id)
    })

    {:noreply, socket}
  end

  def handle_info(%{event: "tournament:finished", payload: payload}, socket) do
    push(socket, "tournament:finished", %{
      tournament: payload.tournament
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

  def handle_info(message, socket) do
    Logger.warning("Unexpected message: " <> inspect(message))
    {:noreply, socket}
  end

  defp subscribe_on_tournament_events(tournament, socket) do
    current_user = socket.assigns.current_user

    Codebattle.PubSub.subscribe("tournament:#{tournament.id}:player:#{current_user.id}")

    if Helpers.can_moderate?(tournament, current_user) do
      Codebattle.PubSub.subscribe("tournament:#{tournament.id}")
    else
      Codebattle.PubSub.subscribe("tournament:#{tournament.id}:common")
    end

    tournament
  end

  defp get_tournament_join_payload(%{type: type} = tournament, socket)
       when type in ["swiss", "ladder", "stairway"] do
    current_user = socket.assigns.current_user

    current_player = Helpers.get_player(tournament, current_user.id)
    top_players = Helpers.get_top_players(tournament)

    player_ids =
      ([current_player] ++ top_players)
      |> Enum.reject(&is_nil/1)
      |> Enum.map(fn %{id: id} -> id end)
      |> Enum.uniq()

    opponents = Helpers.get_opponents(tournament, player_ids)

    players =
      if Helpers.can_moderate?(tournament, current_user) do
        Helpers.get_players(tournament)
      else
        ([current_player] ++ top_players ++ opponents)
        |> Enum.reject(&is_nil/1)
        |> Enum.uniq_by(& &1.id)
      end

    top_player_ids =
      if Helpers.can_moderate?(tournament, current_user) do
        players |> Enum.map(& &1.id)
      else
        top_players |> Enum.map(& &1.id)
      end

    matches =
      if Helpers.can_moderate?(tournament, current_user) do
        Helpers.get_matches_by_players(tournament, player_ids)
      else
        Helpers.get_matches_by_players(tournament, [current_user.id])
      end

    %{
      tournament: Map.drop(tournament, [:players_table, :matches_table, :tasks_table]),
      players: players,
      matches: matches,
      top_player_ids: top_player_ids
    }
  end

  defp get_tournament_join_payload(tournament, _socket) do
    %{
      tournament: Map.drop(tournament, [:players_table, :matches_table, :tasks_table]),
      matches: Helpers.get_matches(tournament),
      players: Helpers.get_players(tournament)
    }
  end

  defp mark_player_as_online(tournament, current_user) do
    case Tournament.Players.get_player(tournament, current_user.id) do
      %{was_online: false} = player ->
        Tournament.Players.put_player(tournament, %{player | was_online: true})

      _ ->
        :noop
    end
  end
end
