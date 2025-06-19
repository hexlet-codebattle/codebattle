defmodule CodebattleWeb.TournamentAdminChannel do
  @moduledoc false
  use CodebattleWeb, :channel

  alias Codebattle.Tournament
  alias Codebattle.Tournament.Helpers
  alias Codebattle.Tournament.TournamentResult
  alias Codebattle.UserGameReport

  require Logger

  @default_ranking_size 200

  def join("tournament_admin:" <> tournament_id, _payload, socket) do
    current_user = socket.assigns.current_user

    with tournament when not is_nil(tournament) <-
           Tournament.Context.get!(tournament_id),
         true <- Helpers.can_moderate?(tournament, current_user) do
      Codebattle.PubSub.subscribe("tournament:#{tournament.id}")
      Codebattle.PubSub.subscribe("tournament:#{tournament.id}:common")

      {
        :ok,
        get_tournament_join_payload(tournament),
        assign(socket, tournament_info: Helpers.tournament_info(tournament))
      }
    else
      _ ->
        {:error, %{reason: "not_found"}}
    end
  end

  def handle_in("tournament:player:join", %{"user_id" => user_id}, socket) do
    tournament_id = socket.assigns.tournament_info.id

    Tournament.Context.handle_event(tournament_id, :join, %{
      user_id: user_id
    })

    {:noreply, socket}
  end

  def handle_in("tournament:ban:list_reports", _params, socket) do
    # TODO: for pagination
    tournament_id = socket.assigns.tournament_info.id
    reports = UserGameReport.list_by_tournament(tournament_id, limit: 300)

    {:reply, {:ok, %{reports: reports}}, socket}
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

  def handle_in("tournament:get_task", %{"task_id" => task_id}, socket) do
    task =
      task_id
      |> Codebattle.Task.get()
      |> Map.take([:id, :level, :name, :description_ru, :description_en, :examples])

    {:reply, {:ok, task}, socket}
  end

  def handle_in("tournament:get_results", %{"params" => params}, socket) do
    tournament = socket.assigns.tournament_info

    results =
      case params do
        %{"type" => "top_users_by_clan_ranking"} ->
          TournamentResult.get_top_users_by_clan_ranking(
            tournament,
            Map.get(params, "players_limit", 5),
            Map.get(params, "clans_limit", 7)
          )

        %{"type" => "tasks_ranking"} ->
          TournamentResult.get_tasks_ranking(tournament)

        %{"type" => "task_duration_distribution", "task_id" => task_id} ->
          TournamentResult.get_task_duration_distribution(
            tournament,
            task_id
          )

        %{"type" => "clans_bubble_distribution"} ->
          TournamentResult.get_clans_bubble_distribution(
            tournament,
            Map.get(params, "max_radius", 7)
          )

        %{"type" => "top_user_by_task_ranking", "task_id" => task_id} ->
          TournamentResult.get_top_user_by_task_ranking(
            tournament,
            task_id,
            Map.get(params, "limit", 40)
          )

        _ ->
          []
      end

    {:reply, {:ok, %{results: results}}, socket}
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

  def handle_in("tournament:match:game_over", %{"match_id" => match_id}, socket) do
    tournament_id = socket.assigns.tournament_info.id

    Tournament.Context.handle_event(tournament_id, :game_over_match, %{match_id: match_id})

    {:noreply, socket}
  end

  def handle_in("tournament:players:request", %{"player_ids" => player_ids}, socket) do
    tournament_info = socket.assigns.tournament_info
    players = Helpers.get_players(tournament_info, player_ids)

    {:reply, {:ok, %{players: players}}, socket}
  end

  def handle_in("tournament:matches:request_for_round", _params, socket) do
    tournament_info = socket.assigns.tournament_info
    matches = Helpers.get_matches(tournament_info, tournament_info.current_round_potision)

    {:reply, {:ok, %{matches: matches}}, socket}
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

  def handle_in("tournament:ranking:request", _params, socket) do
    tournament_info = socket.assigns.tournament_info
    ranking = Tournament.Ranking.get_page(tournament_info, 1, @default_ranking_size)
    {:reply, {:ok, %{ranking: ranking}}, socket}
  end

  def handle_in("tournament:report:update", %{"report_id" => report_id, "state" => state}, socket) do
    report = UserGameReport.get!(report_id)

    case UserGameReport.update(report, %{state: state}) do
      {:ok, report} -> {:reply, {:ok, %{report: report}}, socket}
      {:error, reason} -> {:reply, {:error, reason}, socket}
      _ -> {:reply, {:error, :failure}, socket}
    end
  rescue
    _ -> {:reply, {:error, :failure}, socket}
  end

  def handle_in("tournament:stream:active_game", payload, socket) do
    tournament_id = socket.assigns.tournament_info.id

    Codebattle.PubSub.broadcast("tournament:stream:active_game", %{
      game_id: payload["game_id"],
      tournament_id: tournament_id
    })

    {:noreply, socket}
  rescue
    _ -> {:reply, {:error, :failure}, socket}
  end

  def handle_in(_topic, _payload, socket) do
    {:noreply, socket}
  end

  def handle_info(%{event: "tournament:player:reported", payload: payload}, socket) do
    push(socket, "tournament:report:pending", %{report: payload.report})

    {:noreply, socket}
  end

  def handle_info(%{event: "tournament:report:updated", payload: payload}, socket) do
    push(socket, "tournament:report:updated", %{report: payload.report})

    {:noreply, socket}
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

  def handle_info(%{event: "tournament:results_updated", payload: payload}, socket) do
    push(socket, "tournament:results_updated", payload)

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

    # if tournament.type in ["swiss", "arena"] do
    #   []
    # else
    matches =
      Helpers.get_matches(tournament)

    # end

    %{
      tasks_info: tasks_info,
      reports: UserGameReport.list_by_tournament(tournament.id, limit: 300),
      tournament: Helpers.prepare_to_json(tournament),
      ranking: Tournament.Ranking.get_page(tournament, 1, @default_ranking_size),
      players: Helpers.get_players(tournament),
      matches: matches,
      clans: clans
    }
  end

  defp cast_game_params(%{"task_level" => level, "timeout_seconds" => seconds}),
    do: %{task_level: level, timeout_seconds: seconds}

  defp cast_game_params(%{"task_level" => level}), do: %{task_level: level}

  defp cast_game_params(%{"task_id" => id, "timeout_seconds" => seconds}), do: %{task_id: id, timeout_seconds: seconds}

  defp cast_game_params(%{"task_id" => id}), do: %{task_id: id}
  defp cast_game_params(_params), do: %{}
end
