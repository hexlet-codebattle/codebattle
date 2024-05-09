defmodule CodebattleWeb.TournamentAdminChannel do
  @moduledoc false
  use CodebattleWeb, :channel

  require Logger

  alias Codebattle.Tournament
  alias Codebattle.Tournament.Helpers

  def join("tournament_admin:" <> tournament_id, _payload, socket) do
    current_user = socket.assigns.current_user

    with tournament when not is_nil(tournament) <-
           Tournament.Context.get!(tournament_id),
         true <- Helpers.can_moderate?(tournament, current_user) do
      Codebattle.PubSub.subscribe("tournament:#{tournament.id}")
      Codebattle.PubSub.subscribe("tournament:#{tournament.id}:common")

      {:ok, get_tournament_join_payload(tournament),
       assign(socket, tournament_info: Helpers.tournament_info(tournament))}
    else
      _ ->
        {:error, %{reason: "not_found"}}
    end
  end

  def handle_in("tournament:ban:player", %{"user_id" => user_id}, socket) do
    tournament_id = socket.assigns.tournament_info.id

    Tournament.Context.handle_event(tournament_id, :ban_player, %{
      user_id: user_id
    })

    {:reply, {:ok, :banned}, socket}
  end

  def handle_in("tournament:restart", _params, socket) do
    tournament_id = socket.assigns.tournament_info.id
    tournament = Tournament.Context.get!(tournament_id)

    Tournament.Context.restart(tournament)
    Tournament.Context.handle_event(tournament_id, :restart, %{user: socket.assigns.current_user})

    tournament = Tournament.Context.get!(tournament_id)

    if tournament do
      broadcast!(socket, "tournament:restarted", %{
        tournament: Helpers.prepare_to_json(tournament)
      })
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

  def handle_in("tournament:toggle_match_visible", %{"game_id" => game_id}, socket) do
    Codebattle.PubSub.broadcast("game:toggle_visible", %{game_id: game_id})

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

    Tournament.Context.handle_event(tournament_id, :cancel, %{
      user: socket.assigns.current_user
    })

    tournament = Tournament.Context.get_tournament_info(tournament_id)

    broadcast!(socket, "tournament:update", %{tournament: tournament})

    {:reply, {:ok, %{tournament: tournament}}, socket}
  end

  def handle_in("tournament:start", _, socket) do
    tournament_id = socket.assigns.tournament_info.id

    Tournament.Context.handle_event(tournament_id, :start, %{
      user: socket.assigns.current_user
    })

    {:noreply, socket}
  end

  def handle_in("tournament:start_round", params, socket) do
    tournament_id = socket.assigns.tournament_info.id

    Tournament.Context.handle_event(tournament_id, :start_round_force, cast_game_params(params))

    {:noreply, socket}
  end

  def handle_in("tournament:finish_round", _, socket) do
    tournament_id = socket.assigns.tournament_info.id

    Tournament.Context.handle_event(tournament_id, :finish_round, %{})

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

  def handle_info(%{event: "tournament:updated", payload: payload}, socket) do
    matches =
      if payload.tournament.type in ["swiss", "arena"] do
        []
      else
        Helpers.get_matches(socket.assigns.tournament_info)
      end

    players =
      if payload.tournament.type in ["swiss", "arena"] do
        []
      else
        Helpers.get_players(socket.assigns.tournament_info)
      end

    tasks_info =
      if payload.tournament.type == "versus" do
        payload.tournament
        |> Helpers.get_tasks()
        |> Enum.map(&Map.take(&1, [:id, :level, :name, :description]))
      else
        []
      end

    push(socket, "tournament:update", %{
      tournament: payload.tournament,
      players: players,
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

  defp get_tournament_join_payload(tournament) do
    tasks_info =
      if tournament.type == "versus" do
        tournament
        |> Helpers.get_tasks()
        |> Enum.map(&Map.take(&1, [:id, :level, :name, :description]))
      else
        %{}
      end

    clans =
      if tournament.use_clan do
        Tournament.Clans.get_all(tournament)
      else
        %{}
      end

    %{
      tasks_info: tasks_info,
      tournament: Helpers.prepare_to_json(tournament),
      ranking: Tournament.Ranking.get_page(tournament, 1),
      players: Helpers.get_players(tournament),
      matches: Helpers.get_matches(tournament),
      clans: clans
    }
  end

  defp cast_game_params(%{"task_level" => level, "timeout_seconds" => seconds}),
    do: %{task_level: level, timeout_seconds: seconds}

  defp cast_game_params(%{"task_level" => level}), do: %{task_level: level}

  defp cast_game_params(%{"task_id" => id, "timeout_seconds" => seconds}),
    do: %{task_id: id, timeout_seconds: seconds}

  defp cast_game_params(%{"task_id" => id}), do: %{task_id: id}
  defp cast_game_params(_params), do: %{}
end
