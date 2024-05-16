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
      Codebattle.PubSub.subscribe("tournament:#{tournament.id}:common")
      Codebattle.PubSub.subscribe("tournament:#{tournament.id}:player:#{current_user.id}")

      current_player = Helpers.get_player(tournament, current_user.id)

      {:ok, get_tournament_join_payload(tournament, current_player),
       assign(socket,
         tournament_info:
           Map.take(tournament, [
             :id,
             :ranking_type,
             :use_clan,
             :players_table,
             :ranking_table,
             :clans_table,
             :matches_table,
             :tasks_table
           ])
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
    tournament = socket.assigns.tournament_info
    user = socket.assigns.current_user

    Tournament.Context.handle_event(tournament.id, :join, %{
      user: user
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

  def handle_in("matchmaking:pause", _, socket) do
    tournament_id = socket.assigns.tournament_info.id

    Tournament.Context.handle_event(tournament_id, :matchmaking_pause, %{
      user_id: socket.assigns.current_user.id
    })

    {:noreply, socket}
  end

  def handle_in("matchmaking:resume", _, socket) do
    tournament_id = socket.assigns.tournament_info.id

    Tournament.Context.handle_event(tournament_id, :matchmaking_resume, %{
      user_id: socket.assigns.current_user.id
    })

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

  # def handle_in(
  #       "tournament:players:paginated",
  #       %{"page_num" => page_num, "page_size" => page_size},
  #       socket
  #     ) do
  #   tournament_info = socket.assigns.tournament_info
  #
  #   players =
  #     Helpers.get_paginated_players(tournament_info, min(page_num, 1000), min(page_size, 30))
  #
  #   {:reply, {:ok, %{players: players, top_player_ids: players}}, socket}
  # end

  def handle_info(%{event: "tournament:updated", payload: payload}, socket) do
    current_user = socket.assigns.current_user

    matches =
      if payload.tournament.type in ["swiss", "arena", "show"] do
        []
      else
        Helpers.get_matches(payload.tournament)
      end

    tasks_info =
      if payload.tournament.type == "versus" and
           Helpers.can_moderate?(payload.tournament, current_user) do
        payload.tournament
        |> Helpers.get_tasks()
        |> Enum.map(&Map.take(&1, [:id, :level, :name, :description]))
      else
        []
      end

    push(socket, "tournament:update", %{
      tournament:
        Map.drop(payload.tournament, [
          :__struct__,
          :__meta__,
          :clans_table,
          :creator,
          :event,
          :matches,
          :matches_table,
          :players,
          :players_table,
          :ranking_table,
          :round_tasks,
          :tasks_table,
          :played_pair_ids
        ]),
      players: Helpers.get_top_players(payload.tournament),
      matches: matches,
      tasks_info: tasks_info
    })

    {:noreply, socket}
  end

  def handle_info(%{event: "tournament:match:upserted", payload: payload}, socket) do
    push(socket, "tournament:match:upserted", %{match: payload.match, players: payload.players})

    {:noreply, socket}
  end

  def handle_info(%{event: "tournament:round_created", payload: payload}, socket) do
    push(socket, "tournament:round_created", %{
      tournament: payload.tournament
    })

    {:noreply, socket}
  end

  def handle_info(%{event: "tournament:round_finished", payload: payload}, socket) do
    push(socket, "tournament:round_finished", %{
      tournament: payload.tournament
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
    if payload.player.id == socket.assigns.current_user.id do
      tournament = socket.assigns.tournament_info
      user = socket.assigns.current_user
      ranking = Tournament.Ranking.get_nearest_page_by_player(tournament, user)
      clans = Tournament.Helpers.get_clans_by_ranking(tournament, ranking)

      push(socket, "tournament:player:joined", payload)
      push(socket, "tournament:ranking_update", %{ranking: ranking, clans: clans})
    else
      push(socket, "tournament:player:joined", payload)
    end

    {:noreply, socket}
  end

  def handle_info(%{event: "tournament:player:left", payload: payload}, socket) do
    push(socket, "tournament:player:left", payload)

    {:noreply, socket}
  end

  def handle_info(message = %{event: "waiting_room:player" <> _rest}, socket) do
    push(socket, message.event, message.payload)

    {:noreply, socket}
  end

  def handle_info(message, socket) do
    Logger.warning("TournamentChannel Unexpected message: " <> inspect(message))
    {:noreply, socket}
  end

  defp get_tournament_join_payload(tournament, nil) do
    ranking = Tournament.Ranking.get_page(tournament, 1)

    %{
      matches: [],
      players: [],
      ranking: ranking,
      clans: Helpers.get_clans_by_ranking(tournament, ranking),
      current_player: nil,
      tournament: Helpers.prepare_to_json(tournament)
    }
  end

  defp get_tournament_join_payload(tournament, current_player) do
    player_data =
      if tournament.players_count > 128 do
        player_matches = Helpers.get_matches_by_players(tournament, [current_player.id])

        opponents =
          Helpers.get_player_opponents_from_matches(tournament, player_matches, current_player.id)

        %{
          players: [current_player | opponents],
          matches: player_matches
        }
      else
        %{
          matches: Helpers.get_matches(tournament),
          players: Helpers.get_players(tournament)
        }
      end

    ranking = Tournament.Ranking.get_nearest_page_by_player(tournament, current_player)

    Map.merge(player_data, %{
      ranking: ranking,
      clans: Helpers.get_clans_by_ranking(tournament, ranking),
      current_player: current_player,
      tournament: Helpers.prepare_to_json(tournament)
    })
  end
end
