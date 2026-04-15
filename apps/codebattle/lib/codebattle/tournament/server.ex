defmodule Codebattle.Tournament.Server do
  @moduledoc false
  use GenServer

  import Codebattle.Tournament.Helpers

  alias Codebattle.Tournament

  require Logger

  @type tournament_id :: pos_integer()
  @tournament_info_table :tournament_info_cache
  @freeze_retry_ms 1_000
  @tournament_info_drop_fields [
    :__struct__,
    :__meta__,
    :creator,
    :event,
    :matches,
    :players,
    :stats,
    :played_pair_ids
  ]

  @virtual_fields [
    :clans_table,
    :matches_table,
    :players_table,
    :ranking_table,
    :tasks_table,
    :is_live,
    :module,
    :round_op_id,
    :round_op_status,
    :round_state,
    :played_pair_ids,
    :players_count,
    :event_ranking,
    :task_ids,
    :current_round_timeout_seconds
  ]
  # API
  def start_link(tournament_id) do
    GenServer.start(__MODULE__, tournament_id, name: server_name(tournament_id))
  end

  def get_tournament_info(id) do
    # Try to get from ETS cache first
    if :ets.whereis(@tournament_info_table) == :undefined do
      GenServer.call(server_name(id), :get_tournament_info, 20_000)
    else
      case :ets.lookup(@tournament_info_table, id) do
        [{^id, tournament_info}] ->
          tournament_info

        [] ->
          # Fall back to GenServer call if not in cache
          GenServer.call(server_name(id), :get_tournament_info, 20_000)
      end
    end
  catch
    :exit, {:noproc, _} ->
      nil

    :exit, {:shutdown, _} ->
      nil

    :exit, reason ->
      Logger.error("Error to get tournament: #{inspect(reason)}")
      nil
  end

  def get_tournament(id) do
    GenServer.call(server_name(id), :get_tournament, 20_000)
  catch
    :exit, {:noproc, _} ->
      nil

    :exit, {:shutdown, _} ->
      nil

    :exit, reason ->
      Logger.error("Error to get tournament: #{inspect(reason)}")
      nil
  end

  def update_tournament(tournament) do
    GenServer.call(server_name(tournament.id), {:update, tournament})
  catch
    :exit, reason ->
      Logger.warning("Error to send tournament update: #{inspect(reason)}")
      {:error, :not_found}
  end

  @spec finish_round_after(tournament_id, non_neg_integer(), pos_integer()) ::
          :ok | {:error, :not_found}
  def finish_round_after(tournament_id, round_position, timeout_in_seconds) do
    GenServer.call(
      server_name(tournament_id),
      {:finish_round_after, round_position, timeout_in_seconds},
      30_000
    )
  catch
    :exit, reason ->
      Logger.warning("Error to send tournament update: #{inspect(reason)}")
      {:error, :not_found}
  end

  @spec stop_round_break_after(tournament_id, non_neg_integer(), pos_integer()) ::
          :ok | {:error, :not_found}
  def stop_round_break_after(tournament_id, round_position, timeout_in_seconds) do
    GenServer.call(
      server_name(tournament_id),
      {:stop_round_break_after, round_position, timeout_in_seconds}
    )
  catch
    :exit, reason ->
      Logger.warning("Error to send tournament update: #{inspect(reason)}")
      {:error, :not_found}
  end

  def handle_event(tournament_id, event_type, params) do
    GenServer.call(server_name(tournament_id), {:fire_event, event_type, params}, 20_000)
  catch
    :exit, reason ->
      Logger.warning("Error to send tournament update: #{inspect(reason)}")
      {:error, :not_found}
  end

  def cast_event(tournament_id, event_type, params) do
    GenServer.cast(server_name(tournament_id), {:fire_event, event_type, params})
  catch
    :exit, reason ->
      Logger.warning("Error to send tournament update: #{inspect(reason)}")
      {:error, :not_found}
  end

  def freeze(tournament_id) do
    GenServer.call(server_name(tournament_id), :freeze)
  catch
    :exit, _reason -> {:error, :not_found}
  end

  def unfreeze(tournament_id) do
    GenServer.call(server_name(tournament_id), :unfreeze)
  catch
    :exit, _reason -> {:error, :not_found}
  end

  def export_state(tournament_id) do
    GenServer.call(server_name(tournament_id), :export_state, 30_000)
  catch
    :exit, _reason -> {:error, :not_found}
  end

  def import_state(tournament_id, snapshot) do
    GenServer.call(server_name(tournament_id), {:import_state, snapshot}, 30_000)
  catch
    :exit, _reason -> {:error, :not_found}
  end

  # SERVER
  def init(tournament_id) do
    if :ets.whereis(@tournament_info_table) == :undefined do
      :ets.new(@tournament_info_table, [
        :set,
        :public,
        :named_table,
        {:write_concurrency, true},
        {:read_concurrency, true}
      ])
    end

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
      |> Map.put(:matches_table, matches_table)
      |> Map.put(:players_table, players_table)
      |> Map.put(:ranking_table, ranking_table)
      |> Map.put(:tasks_table, tasks_table)
      |> Map.put(:clans_table, clans_table)

    if tournament.grade != "open" and tournament.state not in ["canceled", "finished"] do
      time_diff_ms = DateTime.diff(tournament.starts_at, DateTime.utc_now()) * 1000
      Process.send_after(self(), :start_grade_tournament, max(time_diff_ms, 0))
    end

    {:ok, %{tournament: tournament, frozen: false, break_timer_expired: false}}
  end

  def handle_cast({:fire_event, event_type, params}, state) do
    {:reply, _tournament, new_state} = handle_call({:fire_event, event_type, params}, nil, state)

    {:noreply, new_state}
  end

  def handle_call({:update, new_tournament}, _from, state) do
    if state.frozen do
      {:reply, {:error, :handoff_in_progress}, state}
    else
      persisted_fields =
        new_tournament
        |> Map.from_struct()
        |> Map.drop([:__meta__] ++ @virtual_fields)

      merged_tournament = Map.merge(state.tournament, persisted_fields)

      update_tournament_info_cache(merged_tournament)

      broadcast_tournament_update(merged_tournament)
      {:reply, :ok, %{state | tournament: merged_tournament}}
    end
  end

  def handle_call(:freeze, _from, state) do
    {:reply, :ok, %{state | frozen: true}}
  end

  def handle_call(:unfreeze, _from, state) do
    {:reply, :ok, %{state | frozen: false}}
  end

  def handle_call(:export_state, _from, state) do
    tournament = state.tournament

    snapshot = %{
      tournament: export_tournament_struct(tournament),
      ets: %{
        players: safe_tab2list(tournament.players_table),
        matches: safe_tab2list(tournament.matches_table),
        tasks: safe_tab2list(tournament.tasks_table),
        ranking: safe_tab2list(tournament.ranking_table),
        clans: safe_tab2list(tournament.clans_table),
        tournament_info_cache: safe_info_cache(tournament.id)
      }
    }

    {:reply, {:ok, snapshot}, state}
  end

  def handle_call({:import_state, snapshot}, _from, state) do
    imported_tournament =
      state.tournament
      |> merge_snapshot_tournament(Map.get(snapshot, :tournament, %{}))
      |> load_ets_snapshot(Map.get(snapshot, :ets, %{}))

    update_tournament_info_cache(imported_tournament)
    {:reply, :ok, %{state | tournament: imported_tournament, frozen: false}}
  end

  def handle_call({:finish_round_after, round_position, timeout_in_seconds}, _from, state) do
    if state.frozen do
      {:reply, {:error, :handoff_in_progress}, state}
    else
      Process.send_after(
        self(),
        {:finish_round_force, round_position},
        to_timeout(second: timeout_in_seconds)
      )

      {:reply, :ok, state}
    end
  end

  def handle_call({:stop_round_break_after, round_position, timeout_in_seconds}, _from, state) do
    if state.frozen do
      {:reply, {:error, :handoff_in_progress}, state}
    else
      Process.send_after(
        self(),
        {:stop_round_break, round_position},
        to_timeout(second: timeout_in_seconds)
      )

      {:reply, :ok, state}
    end
  end

  def handle_call(:get_tournament, _from, state) do
    {:reply, state.tournament, state}
  end

  def handle_call(:get_tournament_info, _from, state) do
    update_tournament_info_cache(state.tournament)

    tournament_info = Map.drop(state.tournament, @tournament_info_drop_fields)
    {:reply, tournament_info, state}
  end

  def handle_call({:fire_event, event_type, params}, _from, %{tournament: tournament} = state) do
    if state.frozen do
      {:reply, {:error, :handoff_in_progress}, state}
    else
      %{module: module} = tournament

      new_tournament =
        if map_size(params) == 0 do
          apply(module, event_type, [tournament])
        else
          apply(module, event_type, [tournament, params])
        end

      update_tournament_info_cache(new_tournament)

      # TODO: rethink broadcasting during applying event, maybe put inside tournament module
      broadcast_tournament_event_by_type(event_type, params, new_tournament)

      {:reply, new_tournament, Map.put(state, :tournament, new_tournament)}
    end
  end

  def handle_info(:start_grade_tournament, %{tournament: tournament} = state) do
    if state.frozen do
      defer_message(:start_grade_tournament, "start_grade_tournament", state)
    else
      case tournament do
        %{players_count: pc} = t when pc > 0 -> cast_event(t.id, :start, %{})
        %{players_count: 0} = t -> cast_event(t.id, :cancel, %{})
      end

      {:noreply, %{state | tournament: tournament}}
    end
  end

  def handle_info({:stop_round_break, round_position}, %{tournament: tournament} = state) do
    if state.frozen do
      defer_message({:stop_round_break, round_position}, "stop_round_break", state)
    else
      if tournament.current_round_position == round_position and
           in_break?(tournament) and
           not finished?(tournament) do
        process_stop_round_break(state, tournament)
      else
        {:noreply, %{state | tournament: tournament}}
      end
    end
  end

  def handle_info(:finish_tournament_force, %{tournament: tournament} = state) do
    if state.frozen do
      defer_message(:finish_tournament_force, "finish_tournament_force", state)
    else
      if finished?(tournament) do
        {:noreply, %{state | tournament: tournament}}
      else
        new_tournament = tournament.module.finish_tournament(tournament)
        update_tournament_info_cache(new_tournament)
        {:noreply, %{state | tournament: new_tournament}}
      end
    end
  end

  def handle_info({:finish_round_force, round_position}, %{tournament: tournament} = state) do
    if state.frozen do
      defer_message({:finish_round_force, round_position}, "finish_round_force", state)
    else
      if tournament.current_round_position == round_position and
           not in_break?(tournament) and
           not finished?(tournament) do
        new_tournament = tournament.module.finish_round(tournament)
        update_tournament_info_cache(new_tournament)

        {:noreply, %{state | tournament: new_tournament}}
      else
        {:noreply, %{state | tournament: tournament}}
      end
    end
  end

  def handle_info(
        %{topic: "game:tournament:" <> _t_id, event: "game:tournament:finished", payload: payload},
        %{tournament: tournament} = state
      ) do
    if state.frozen do
      defer_message(
        %{topic: "game:tournament:#{tournament.id}", event: "game:tournament:finished", payload: payload},
        "game_tournament_finished",
        state
      )
    else
      match = get_match(tournament, payload.ref)

      case match do
        nil ->
          defer_message(
            %{topic: "game:tournament:#{tournament.id}", event: "game:tournament:finished", payload: payload},
            "game_tournament_match_missing",
            state
          )

        %{state: "playing"} = match ->
          maybe_finish_live_match(state, tournament, match, payload)

        _match ->
          {:noreply, %{state | tournament: tournament}}
      end
    end
  end

  def handle_info({:round_finish_completed, op_id, finished_tournament}, %{tournament: tournament} = state) do
    if state.frozen do
      defer_message({:round_finish_completed, op_id, finished_tournament}, "round_finish_completed", state)
    else
      if tournament.round_op_id == op_id and tournament.round_state == "round_finishing" do
        process_round_finish_completed(state, tournament, finished_tournament)
      else
        {:noreply, state}
      end
    end
  end

  def handle_info({:round_finish_failed, op_id, reason}, %{tournament: tournament} = state) do
    if state.frozen do
      defer_message({:round_finish_failed, op_id, reason}, "round_finish_failed", state)
    else
      if tournament.round_op_id == op_id and tournament.round_state == "round_finishing" do
        Logger.error("Round finishing failed for tournament #{tournament.id}, op_id=#{op_id}, reason=#{inspect(reason)}")

        new_tournament =
          tournament
          |> Map.put(:round_state, "active")
          |> Map.put(:round_op_status, "failed")
          |> Map.put(:round_op_id, nil)

        update_tournament_info_cache(new_tournament)
        {:noreply, %{state | tournament: new_tournament}}
      else
        {:noreply, state}
      end
    end
  end

  def handle_info({:start_rematch, match_ref, round_position}, %{tournament: tournament} = state) do
    if state.frozen do
      defer_message({:start_rematch, match_ref, round_position}, "start_rematch", state)
    else
      if tournament.current_round_position == round_position and
           not in_break?(tournament) and
           not finished?(tournament) do
        new_tournament = tournament.module.start_rematch(tournament, match_ref)
        update_tournament_info_cache(new_tournament)

        broadcast_tournament_update(new_tournament)

        {:noreply, %{state | tournament: new_tournament}}
      else
        {:noreply, %{state | tournament: tournament}}
      end
    end
  end

  def handle_info(:terminate, %{tournament: tournament} = state) do
    Tournament.GlobalSupervisor.terminate_tournament(tournament.id)
    {:noreply, state}
  end

  def handle_info(_message, state) do
    {:noreply, state}
  end

  def tournament_topic_name(tournament_id), do: "tournament:#{tournament_id}"

  defp update_tournament_info_cache(tournament) do
    tournament_info = Map.drop(tournament, @tournament_info_drop_fields)
    :ets.insert(@tournament_info_table, {tournament.id, tournament_info})
  end

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

  defp server_name(id), do: {:via, Registry, {Codebattle.Registry, "tournament_srv::#{id}"}}

  defp export_tournament_struct(tournament) do
    tournament
    |> Map.from_struct()
    |> Map.drop([
      :__meta__,
      :creator,
      :event,
      :players_table,
      :matches_table,
      :tasks_table,
      :ranking_table,
      :clans_table
    ])
  end

  defp merge_snapshot_tournament(tournament, snapshot_tournament) do
    attrs = Map.drop(snapshot_tournament, [:players_table, :matches_table, :tasks_table, :ranking_table, :clans_table])

    struct(tournament, attrs)
  end

  defp load_ets_snapshot(tournament, ets_snapshot) do
    replace_table_rows(tournament.players_table, Map.get(ets_snapshot, :players, []))
    replace_table_rows(tournament.matches_table, Map.get(ets_snapshot, :matches, []))
    replace_table_rows(tournament.tasks_table, Map.get(ets_snapshot, :tasks, []))
    replace_table_rows(tournament.ranking_table, Map.get(ets_snapshot, :ranking, []))
    replace_table_rows(tournament.clans_table, Map.get(ets_snapshot, :clans, []))
    restore_info_cache(tournament.id, Map.get(ets_snapshot, :tournament_info_cache))
    tournament
  end

  defp replace_table_rows(_table, rows) when not is_list(rows), do: :ok

  defp replace_table_rows(table, rows) do
    :ets.delete_all_objects(table)
    :ets.insert(table, rows)
  end

  defp safe_tab2list(nil), do: []

  defp safe_tab2list(table) do
    :ets.tab2list(table)
  rescue
    _e -> []
  end

  defp safe_info_cache(tournament_id) do
    case :ets.lookup(@tournament_info_table, tournament_id) do
      [{^tournament_id, tournament_info}] -> {tournament_id, tournament_info}
      _ -> nil
    end
  rescue
    _e -> nil
  end

  defp restore_info_cache(_tournament_id, nil), do: :ok

  defp restore_info_cache(tournament_id, {cached_id, tournament_info}) when tournament_id == cached_id do
    :ets.insert(@tournament_info_table, {cached_id, tournament_info})
  rescue
    _e -> :ok
  end

  defp restore_info_cache(_tournament_id, _value), do: :ok

  defp process_stop_round_break(state, tournament) do
    if tournament.round_op_status == "done" do
      # Computation already finished — start next round now
      new_tournament = tournament.module.start_round_force(tournament)
      update_tournament_info_cache(new_tournament)

      {:noreply, %{state | tournament: new_tournament, break_timer_expired: false}}
    else
      # Computation still running — mark break as expired, wait for {:round_finish_completed}
      {:noreply, %{state | break_timer_expired: true}}
    end
  end

  defp process_round_finish_completed(state, tournament, finished_tournament) do
    if_result =
      if tournament.module.finish_tournament?(finished_tournament) do
        tournament.module.maybe_finish_tournament(finished_tournament)
      else
        tournament.module.broadcast_round_finished(finished_tournament)
      end

    new_tournament =
      if_result
      |> Map.put(:round_op_status, "done")
      |> Map.put(:round_op_id, nil)

    if state.break_timer_expired do
      # Break already expired while we were computing — start next round now
      new_tournament =
        if finished?(new_tournament), do: new_tournament, else: tournament.module.start_round_force(new_tournament)

      update_tournament_info_cache(new_tournament)
      {:noreply, %{state | tournament: new_tournament, break_timer_expired: false}}
    else
      # Break still running — wait for {:stop_round_break} to start next round
      new_tournament = Map.put(new_tournament, :round_state, "break")
      broadcast_tournament_update(new_tournament)
      update_tournament_info_cache(new_tournament)
      {:noreply, %{state | tournament: new_tournament}}
    end
  end

  defp defer_message(message, reason, state) do
    Logger.info(
      "[handoff] #{inspect(%{phase: "tournament_defer", reason: reason, tournament_id: state.tournament.id}, limit: :infinity, printable_limit: :infinity)}"
    )

    Process.send_after(self(), message, @freeze_retry_ms)
    {:noreply, state}
  end

  defp should_schedule_round_finish?(%{round_state: "round_finishing"}), do: false

  defp should_schedule_round_finish?(tournament) do
    tournament.module.finish_round_after_match?(tournament)
  end

  defp schedule_round_finish(%{tournament: %{round_state: "round_finishing"}} = state) do
    {:noreply, state}
  end

  defp schedule_round_finish(%{tournament: tournament} = state) do
    op_id = System.unique_integer([:positive, :monotonic])
    server_pid = self()

    # Start break timer immediately alongside computation
    min_break = Application.get_env(:codebattle, :min_break_duration_seconds, 5)
    break_seconds = max(tournament.break_duration_seconds || min_break, min_break)

    Process.send_after(
      self(),
      {:stop_round_break, tournament.current_round_position},
      to_timeout(second: break_seconds)
    )

    in_progress_tournament =
      tournament
      |> Map.put(:round_state, "round_finishing")
      |> Map.put(:round_op_status, "running")
      |> Map.put(:round_op_id, op_id)
      |> Map.put(:break_state, "on")

    update_tournament_info_cache(in_progress_tournament)

    {:ok, _pid} =
      Task.Supervisor.start_child(
        Tournament.Supervisor.task_supervisor_name(in_progress_tournament.id),
        fn ->
          run_round_finish_job(server_pid, in_progress_tournament, op_id)
        end
      )

    {:noreply, %{state | tournament: in_progress_tournament, break_timer_expired: false}}
  end

  defp run_round_finish_job(server_pid, tournament, op_id) do
    result =
      try do
        {:ok, tournament.module.prepare_round_finish(tournament)}
      rescue
        error ->
          {:error, {error, __STACKTRACE__}}
      catch
        kind, value ->
          {:error, {kind, value}}
      end

    case result do
      {:ok, finished_tournament} ->
        send(server_pid, {:round_finish_completed, op_id, finished_tournament})

      {:error, reason} ->
        send(server_pid, {:round_finish_failed, op_id, reason})
    end
  end

  defp maybe_finish_live_match(state, tournament, match, payload) do
    if tournament.current_round_position == match.round_position and
         not in_break?(tournament) and
         not finished?(tournament) do
      new_tournament =
        tournament.module.finish_match(tournament, Map.put(payload, :game_id, match.game_id))

      update_tournament_info_cache(new_tournament)

      updated_state = %{state | tournament: new_tournament}

      if should_schedule_round_finish?(new_tournament) do
        schedule_round_finish(updated_state)
      else
        {:noreply, updated_state}
      end
    else
      {:noreply, %{state | tournament: tournament}}
    end
  end
end
