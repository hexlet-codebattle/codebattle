defmodule Codebattle.Tournament.Server do
  use GenServer
  require Logger

  alias Codebattle.Clan
  alias Codebattle.Tournament
  alias Codebattle.WaitingRoom

  import Tournament.Helpers

  @type tournament_id :: pos_integer()
  @waiting_room_timeout_ms :timer.seconds(1)
  # API
  def start_link(tournament_id) do
    GenServer.start(__MODULE__, tournament_id, name: server_name(tournament_id))
  end

  def match_waiting_room_players(tournament_id) do
    GenServer.cast(server_name(tournament_id), :match_waiting_room_players)
  end

  def update_waiting_room_state(tournament_id, params) do
    GenServer.cast(server_name(tournament_id), {:update_waiting_room_state, params})
  end

  def get_tournament_info(id) do
    try do
      GenServer.call(server_name(id), :get_tournament_info)
    catch
      :exit, {:noproc, _} ->
        nil

      :exit, reason ->
        Logger.error("Error to get tournament: #{inspect(reason)}")
        nil
    end
  end

  def get_tournament(id) do
    try do
      GenServer.call(server_name(id), :get_tournament)
    catch
      :exit, {:noproc, _} ->
        nil

      :exit, reason ->
        Logger.error("Error to get tournament: #{inspect(reason)}")
        nil
    end
  end

  def update_tournament(tournament) do
    try do
      GenServer.call(server_name(tournament.id), {:update, tournament})
    catch
      :exit, reason ->
        Logger.error("Error to send tournament update: #{inspect(reason)}")
        {:error, :not_found}
    end
  end

  @spec finish_round_after(tournament_id, non_neg_integer(), pos_integer()) ::
          :ok | {:error, :not_found}
  def finish_round_after(tournament_id, round_position, timeout_in_seconds) do
    try do
      GenServer.call(
        server_name(tournament_id),
        {:finish_round_after, round_position, timeout_in_seconds}
      )
    catch
      :exit, reason ->
        Logger.error("Error to send tournament update: #{inspect(reason)}")
        {:error, :not_found}
    end
  end

  @spec stop_round_break_after(tournament_id, non_neg_integer(), pos_integer()) ::
          :ok | {:error, :not_found}
  def stop_round_break_after(tournament_id, round_position, timeout_in_seconds) do
    try do
      GenServer.call(
        server_name(tournament_id),
        {:stop_round_break_after, round_position, timeout_in_seconds}
      )
    catch
      :exit, reason ->
        Logger.error("Error to send tournament update: #{inspect(reason)}")
        {:error, :not_found}
    end
  end

  def handle_event(tournament_id, event_type, params) do
    try do
      GenServer.call(server_name(tournament_id), {:fire_event, event_type, params})
    catch
      :exit, reason ->
        Logger.error("Error to send tournament update: #{inspect(reason)}")
        {:error, :not_found}
    end
  end

  # SERVER
  def init(tournament_id) do
    players_table = Tournament.Players.create_table(tournament_id)
    matches_table = Tournament.Matches.create_table(tournament_id)
    tasks_table = Tournament.Tasks.create_table(tournament_id)
    ranking_table = Tournament.Ranking.create_table(tournament_id)
    clans_table = Tournament.Clans.create_table(tournament_id)

    Codebattle.PubSub.subscribe("game:tournament:#{tournament_id}")

    tournament =
      tournament_id
      |> Tournament.Context.get_from_db!()
      |> Tournament.Context.mark_as_live()
      |> maybe_set_waiting_room()
      |> Map.put(:matches_table, matches_table)
      |> Map.put(:players_table, players_table)
      |> Map.put(:ranking_table, ranking_table)
      |> Map.put(:tasks_table, tasks_table)
      |> Map.put(:clans_table, clans_table)
      |> maybe_preload_event_ranking()

    {:ok, %{tournament: tournament}}
  end

  def maybe_set_waiting_room(tournament) do
    case Tournament.Context.get_waiting_room_name(tournament) do
      nil -> tournament
      wrn -> Map.put(tournament, :waiting_room_name, wrn)
    end
  end

  def handle_cast(:match_waiting_room_players, state) do
    handle_info(:match_waiting_room_players, state)
    {:noreply, state}
  end

  def handle_cast({:update_waiting_room_state, params}, state) do
    new_tournament =
      Map.put(
        state.tournament,
        :waiting_room_state,
        Map.merge(state.tournament.waiting_room_state, params)
      )

    {:noreply, %{state | tournament: new_tournament}}
  end

  def handle_call({:update, new_tournament}, _from, state) do
    broadcast_tournament_update(new_tournament)
    {:reply, :ok, %{state | tournament: new_tournament}}
  end

  def handle_call({:finish_round_after, round_position, timeout_in_seconds}, _from, state) do
    Process.send_after(
      self(),
      {:finish_round_force, round_position},
      :timer.seconds(timeout_in_seconds)
    )

    {:reply, :ok, state}
  end

  def handle_call({:stop_round_break_after, round_position, timeout_in_seconds}, _from, state) do
    Process.send_after(
      self(),
      {:stop_round_break, round_position},
      :timer.seconds(timeout_in_seconds)
    )

    {:reply, :ok, state}
  end

  def handle_call(:get_tournament, _from, state) do
    {:reply, state.tournament, state}
  end

  def handle_call(:get_tournament_info, _from, state) do
    {:reply,
     state.tournament
     |> Map.drop([
       :__struct__,
       :__meta__,
       :creator,
       :event,
       :matches,
       :players,
       :waiting_room_state,
       :stats,
       :played_pair_ids,
       :round_tasks
     ]), state}
  end

  def handle_call({:fire_event, event_type, params}, _from, state = %{tournament: tournament}) do
    %{module: module} = tournament

    new_tournament =
      if map_size(params) == 0 do
        apply(module, event_type, [tournament])
      else
        apply(module, event_type, [tournament, params])
      end

    # TODO: rethink broadcasting during applying event, maybe put inside tournament module
    broadcast_tournament_event_by_type(event_type, params, new_tournament)

    {:reply, tournament, Map.merge(state, %{tournament: new_tournament})}
  end

  def handle_info({:stop_round_break, round_position}, %{tournament: tournament}) do
    if tournament.current_round_position == round_position and
         in_break?(tournament) and
         not finished?(tournament) do
      new_tournament = tournament.module.start_round_force(tournament)

      {:noreply, %{tournament: new_tournament}}
    else
      {:noreply, %{tournament: tournament}}
    end
  end

  def handle_info({:finish_round_force, round_position}, %{tournament: tournament}) do
    if tournament.current_round_position == round_position and
         not in_break?(tournament) and
         not finished?(tournament) do
      new_tournament = tournament.module.finish_round(tournament)

      {:noreply, %{tournament: new_tournament}}
    else
      {:noreply, %{tournament: tournament}}
    end
  end

  def handle_info(
        %{
          topic: "game:tournament:" <> _t_id,
          event: "game:tournament:finished",
          payload: payload
        },
        %{tournament: tournament}
      ) do
    match = get_match(tournament, payload.ref)

    if tournament.current_round_position == match.round_position and
         not in_break?(tournament) and
         not finished?(tournament) do
      new_tournament =
        tournament.module.finish_match(tournament, Map.put(payload, :game_id, match.game_id))

      {:noreply, %{tournament: new_tournament}}
    else
      {:noreply, %{tournament: tournament}}
    end
  end

  def handle_info({:start_rematch, match_ref, round_position}, %{tournament: tournament}) do
    if tournament.current_round_position == round_position and
         not in_break?(tournament) and
         not finished?(tournament) do
      new_tournament = tournament.module.start_rematch(tournament, match_ref)

      broadcast_tournament_update(new_tournament)

      {:noreply, %{tournament: new_tournament}}
    else
      {:noreply, %{tournament: tournament}}
    end
  end

  # only for squad tournament starts new games for all pairs
  def handle_info({:start_round_games, match_ref, round_position}, %{tournament: tournament}) do
    if tournament.current_round_position == round_position and
         not in_break?(tournament) and
         not finished?(tournament) do
      new_tournament = tournament.module.start_round_games(tournament, match_ref)

      broadcast_tournament_update(new_tournament)

      {:noreply, %{tournament: new_tournament}}
    else
      {:noreply, %{tournament: tournament}}
    end
  end

  def handle_info(:terminate, %{tournament: tournament}) do
    Tournament.GlobalSupervisor.terminate_tournament(tournament.id)
  end

  # def handle_info(
  #       %{
  #         topic: "waiting_room:" <> _wr_name,
  #         event: "waiting_room:matched",
  #         payload: payload
  #       },
  #       %{tournament: tournament}
  #     ) do
  #   new_tournament =
  #     tournament.module.create_games_for_waiting_room_pairs(
  #       tournament,
  #       payload.pairs,
  #       payload.matched_with_bot
  #     )
  #
  #   {:noreply, %{tournament: new_tournament}}
  # end

  def handle_info(
        :match_waiting_room_players,
        %{
          tournament:
            tournament =
              %Tournament{
                waiting_room_state: %WaitingRoom.State{
                  state: "active"
                }
              }
        }
      ) do
    Logger.error("WR matchingstarted")

    players =
      tournament
      |> Tournament.Players.get_players("matchmaking_active")
      |> Enum.map(&prepare_wr_player/1)

    played_pair_ids = tournament.played_pair_ids

    wr_new_state =
      WaitingRoom.Engine.call(%{
        tournament.waiting_room_state
        | players: players,
          played_pair_ids: played_pair_ids
      })

    tournament.module.create_games_for_waiting_room_pairs(
      tournament,
      wr_new_state.pairs,
      wr_new_state.matched_with_bot
    )

    new_tournament = %{
      tournament
      | played_pair_ids: wr_new_state.played_pair_ids,
        waiting_room_state: %{
          wr_new_state
          | pairs: [],
            matched_with_bot: []
        }
    }

    Process.send_after(self(), :match_waiting_room_players, @waiting_room_timeout_ms)
    {:noreply, %{tournament: new_tournament}}
  end

  def handle_info(
        :match_waiting_room_players,
        %{
          tournament:
            tournament =
              %Tournament{
                waiting_room_state: %WaitingRoom.State{
                  state: "paused"
                }
              }
        }
      ) do
    Process.send_after(self(), :match_waiting_room_players, @waiting_room_timeout_ms)
    {:noreply, %{tournament: tournament}}
  end

  def handle_info(:match_waiting_room_players, state) do
    {:noreply, state}
  end

  def handle_info(_message, state) do
    {:noreply, state}
  end

  def tournament_topic_name(tournament_id), do: "tournament:#{tournament_id}"

  defp broadcast_tournament_update(tournament) do
    Codebattle.PubSub.broadcast("tournament:updated", %{tournament: tournament})
  end

  def broadcast_tournament_event_by_type(:join, %{users: users}, tournament) do
    Enum.each(users, &broadcast_tournament_event_by_type(:join, %{user: &1}, tournament))
  end

  def broadcast_tournament_event_by_type(:join, params, tournament) do
    player = Tournament.Helpers.get_player(tournament, params.user.id)

    if player do
      Codebattle.PubSub.broadcast("tournament:player:joined", %{
        tournament: tournament,
        player: player
      })
    end
  end

  def broadcast_tournament_event_by_type(:leave, params, tournament) do
    Codebattle.PubSub.broadcast("tournament:player:left", %{
      tournament: tournament,
      player_id: params.user_id
    })
  end

  def broadcast_tournament_event_by_type(:start, _params, tournament) do
    Codebattle.PubSub.broadcast("tournament:started", %{tournament: tournament})
  end

  def broadcast_tournament_event_by_type(:start_round_force, _params, _tournament) do
    :noop
  end

  def broadcast_tournament_event_by_type(_default_event, _params, _tournament) do
    # TODO: updated
  end

  defp maybe_preload_event_ranking(
         tournament = %{use_clan: true, use_event_ranking: true, event_id: event_id}
       )
       when not is_nil(event_id) do
    new_tournament = Tournament.Ranking.preload_event_ranking(tournament)

    clans =
      new_tournament.event_ranking
      |> Map.keys()
      |> Clan.get_by_ids()

    Tournament.Clans.put_clans(new_tournament, clans)
    new_tournament
  end

  defp maybe_preload_event_ranking(tournament = %{use_event_ranking: true, event_id: event_id})
       when not is_nil(event_id) do
    Tournament.Ranking.preload_event_ranking(tournament)
  end

  defp maybe_preload_event_ranking(t), do: t

  defp server_name(id), do: {:via, Registry, {Codebattle.Registry, "tournament_srv::#{id}"}}

  defp prepare_wr_player(player) do
    player
    |> Map.take([:id, :clan_id, :score, :wr_joined_at])
    |> Map.put(:tasks, Enum.count(player.task_ids))
  end
end
