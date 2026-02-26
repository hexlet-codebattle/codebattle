defmodule CodebattleWeb.TournamentChannel do
  @moduledoc false
  use CodebattleWeb, :channel

  alias Codebattle.Tournament
  alias Codebattle.Tournament.Helpers
  alias Codebattle.Tournament.TournamentResult
  alias Codebattle.Tournament.TournamentUserResult

  require Logger

  def join("tournament:" <> tournament_id, payload, socket) do
    current_user = socket.assigns.current_user
    auth_payload = merge_access_token(payload, socket.assigns[:access_token])

    with tournament when not is_nil(tournament) <-
           Tournament.Context.get_tournament_info(tournament_id),
         true <- user_authorized?(tournament, current_user, auth_payload) do
      Codebattle.PubSub.subscribe("tournament:#{tournament.id}:common")
      Codebattle.PubSub.subscribe("tournament:#{tournament.id}:player:#{current_user.id}")

      current_player = Helpers.get_player(tournament, current_user.id)

      {:ok, get_tournament_join_payload(tournament, current_player),
       assign(socket,
         tournament_info:
           Map.take(tournament, [
             :id,
             :ranking_type,
             :players,
             :matches,
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

  def handle_in("matchmaking:restart", _, socket) do
    tournament_id = socket.assigns.tournament_info.id

    Tournament.Context.handle_event(tournament_id, :matchmaking_restart, %{
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

  def handle_in("tournament:ranking:request", params, socket) when is_map(params) do
    tournament_info = socket.assigns.tournament_info
    nearest = Map.get(params, "nearest") || Map.get(params, :nearest)

    ranking =
      if nearest do
        user_id =
          params
          |> Map.get("user_id", Map.get(params, "userId"))
          |> parse_pos_integer(socket.assigns.current_user.id)

        page_size =
          params
          |> Map.get("page_size", Map.get(params, "pageSize"))
          |> parse_pos_integer(10)

        get_nearest_ranking_for_user(tournament_info, %{id: user_id}, page_size)
      else
        page = parse_pos_integer(Map.get(params, "page"), 1)

        page_size =
          params
          |> Map.get("page_size", Map.get(params, "pageSize"))
          |> parse_pos_integer(10)

        Tournament.Ranking.get_page(tournament_info, page, page_size)
      end

    {:reply, {:ok, %{ranking: ranking}}, socket}
  end

  def handle_in("tournament:ranking:request", _params, socket) do
    tournament_info = socket.assigns.tournament_info
    ranking = get_nearest_ranking_for_user(tournament_info, socket.assigns.current_user)

    {:reply, {:ok, %{ranking: ranking}}, socket}
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

  def handle_in("tournament:matches:request_for_round", _params, socket) do
    tournament_info = Tournament.Context.get_tournament_info(socket.assigns.tournament_info.id)

    matches = Helpers.get_matches(tournament_info, tournament_info.current_round_position)

    {:reply, {:ok, %{matches: matches}}, socket}
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
        %{"type" => "leaderboard"} ->
          tournament.id
          |> TournamentUserResult.get_leaderboard(32)
          |> Enum.map(
            &Map.take(&1, [
              :avg_result_percent,
              :clan_id,
              :games_count,
              :is_cheater,
              :place,
              :points,
              :score,
              :total_time,
              :tournament_id,
              :user_id,
              :user_name,
              :user_lang,
              :wins_count
            ])
          )

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

  def handle_in(_topic, _payload, socket) do
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

  def handle_info(%{event: "tournament:restarted", payload: payload}, socket) do
    tournament_info = Tournament.Context.get_tournament_info(socket.assigns.tournament_info.id)

    socket =
      assign(socket,
        tournament_info:
          Map.take(tournament_info, [
            :id,
            :ranking_type,
            :players,
            :matches,
            :use_clan,
            :players_table,
            :ranking_table,
            :clans_table,
            :matches_table,
            :tasks_table
          ])
      )

    push(socket, "tournament:restarted", payload)

    {:noreply, socket}
  end

  def handle_info(%{event: "tournament:player:joined", payload: payload}, socket) do
    tournament = socket.assigns.tournament_info
    ranking = get_nearest_ranking_for_user(tournament, socket.assigns.current_user)
    push(socket, "tournament:player:joined", payload)

    push(socket, "tournament:ranking_update", %{
      ranking: ranking,
      clans: build_clans_payload(tournament, ranking)
    })

    {:noreply, socket}
  end

  def handle_info(%{event: "tournament:player:left", payload: payload}, socket) do
    tournament = socket.assigns.tournament_info
    ranking = get_nearest_ranking_for_user(tournament, socket.assigns.current_user)
    push(socket, "tournament:player:left", payload)

    push(socket, "tournament:ranking_update", %{
      ranking: ranking,
      clans: build_clans_payload(tournament, ranking)
    })

    {:noreply, socket}
  end

  def handle_info(message, socket) do
    Logger.warning("TournamentChannel Unexpected message: " <> inspect(message))
    {:noreply, socket}
  end

  defp get_tournament_join_payload(tournament, nil) do
    ranking = Tournament.Ranking.get_page(tournament, 1, 16)

    players =
      if tournament.players_count > 256 do
        []
      else
        Helpers.get_players(tournament)
      end

    %{
      matches: [],
      players: players,
      ranking: ranking,
      # clans: Helpers.get_clans_by_ranking(tournament, ranking),
      current_player: nil,
      tournament: Helpers.prepare_to_json(tournament)
    }
  end

  defp get_tournament_join_payload(tournament, current_player) do
    player_data =
      if tournament.players_count > 256 do
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

    nearest_ranking = get_nearest_ranking_for_player(tournament, current_player)

    Map.merge(player_data, %{
      ranking: nearest_ranking,
      # clans: Helpers.get_clans_by_ranking(tournament, ranking),
      current_player: current_player,
      tournament: Helpers.prepare_to_json(tournament)
    })
  end

  def user_authorized?(tournament, current_user, payload) do
    if FunWithFlags.enabled?(:skip_tournament_websocket_auth) do
      true
    else
      Helpers.can_access?(tournament, current_user, payload)
    end
  end

  defp merge_access_token(payload, nil), do: payload

  defp merge_access_token(payload, access_token) when is_map(payload) do
    Map.put_new(payload, "access_token", access_token)
  end

  defp merge_access_token(_payload, _access_token), do: %{}

  defp parse_pos_integer(nil, default), do: default

  defp parse_pos_integer(value, _default) when is_integer(value) and value > 0 do
    value
  end

  defp parse_pos_integer(value, default) when is_binary(value) do
    case Integer.parse(value) do
      {int, ""} when int > 0 -> int
      _ -> default
    end
  end

  defp parse_pos_integer(_value, default), do: default

  defp build_clans_payload(%{use_clan: true} = tournament, ranking) do
    Helpers.get_clans_by_ranking(tournament, ranking)
  end

  defp build_clans_payload(_tournament, _ranking), do: %{}

  defp get_nearest_ranking_for_user(tournament, current_user, page_size \\ 16) do
    page =
      case Tournament.Ranking.get_by_id(tournament, current_user.id) do
        %{place: place} when is_integer(place) and place > 0 ->
          div(place - 1, page_size) + 1

        _ ->
          1
      end

    Tournament.Ranking.get_page(tournament, page, page_size)
  end

  defp get_nearest_ranking_for_player(tournament, player, page_size \\ 16) do
    page = get_nearest_page_for_player(tournament, player, page_size)

    Tournament.Ranking.get_page(tournament, page, page_size)
  end

  defp get_nearest_page_for_player(tournament, player, page_size) do
    case Tournament.Ranking.get_by_player(tournament, player) do
      %{place: place} when is_integer(place) and place > 0 ->
        div(place - 1, page_size) + 1

      _ ->
        1
    end
  end
end
