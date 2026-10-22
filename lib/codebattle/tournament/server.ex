defmodule Codebattle.Tournament.Server do
  @moduledoc false
  use GenServer

  import Codebattle.Tournament.Helpers

  alias Codebattle.Tournament
  alias Codebattle.Tournament.Storage.Ranking

  require Logger

  @type tournament_id :: pos_integer()
  @tournament_info_table :tournament_info_cache
  @freeze_retry_ms 1_000
  # A finished game whose match never shows up (e.g. after a restart) is retried for ~1 min.
  @match_missing_max_retries 60
  # Events after which the current round may have nothing left to wait for.
  @round_closing_events [:leave, :toggle_ban_player, :toggle_cheater_player, :game_over_match]
  # Ladder: only insert a pre-tick break that ends at least this long before the scheduled tick.
  @ladder_min_break_gap_ms 3_000
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
    :current_round_timeout_seconds,
    :next_round_at,
    :round_durations,
    :results_synced_round_position
  ]
  # API
  def start_link(tournament_id, opts \\ []) do
    GenServer.start_link(__MODULE__, {tournament_id, opts}, name: server_name(tournament_id))
  end

  @doc "Writes a pending debounced snapshot now (before a graceful stop)."
  def flush_persist(id) do
    GenServer.call(server_name(id), :flush_persist, 20_000)
  catch
    :exit, _reason -> :ok
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
  def init(tournament_id) when is_integer(tournament_id), do: init({tournament_id, []})

  def init({tournament_id, opts}) do
    if :ets.whereis(@tournament_info_table) == :undefined do
      :ets.new(@tournament_info_table, [
        :set,
        :public,
        :named_table,
        {:write_concurrency, true},
        {:read_concurrency, true}
      ])
    end

    # The info cache lives in GlobalSupervisor's table and survives this process, so an
    # entry here means the supervisor is restarting us after a crash (ETS data is gone).
    restarted? = :ets.member(@tournament_info_table, tournament_id)

    players_table = Tournament.Players.create_table(tournament_id)
    matches_table = Tournament.Matches.create_table(tournament_id)
    tasks_table = Tournament.Tasks.create_table(tournament_id)
    ranking_table = Tournament.Ranking.create_table(tournament_id)

    Codebattle.PubSub.subscribe("game:tournament:#{tournament_id}")

    db_tournament = Tournament.Context.get_from_db!(tournament_id)
    # Players live in ETS; the jsonb snapshot maps are kept out of the state so that
    # get_tournament calls and task closures don't copy them.

    tournament =
      db_tournament
      |> Map.merge(%{players: %{}, matches: %{}})
      |> Tournament.Context.mark_as_live()
      |> Map.put(:matches_table, matches_table)
      |> Map.put(:players_table, players_table)
      |> Map.put(:ranking_table, ranking_table)
      |> Map.put(:tasks_table, tasks_table)
      |> plan_ladder()

    update_tournament_info_cache(tournament)

    if restarted? and tournament.state in ["waiting_participants", "active"] do
      send(self(), :restore_after_crash)
    end

    {:ok,
     schedule_grade_start(%{
       tournament: tournament,
       frozen: false,
       break_timer_expired: false,
       next_matchmaking_tick_at: nil,
       matchmaking_timer_ref: nil,
       matchmaking_timer_kind: nil,
       persist_timer_ref: nil,
       grade_start_timer_ref: nil,
       restoring_players: Keyword.get(opts, :restoring, false) or restarted?
     })}
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

      merged_tournament = state.tournament |> Map.merge(persisted_fields) |> plan_ladder()

      update_tournament_info_cache(merged_tournament)

      broadcast_tournament_update(merged_tournament)
      {:reply, :ok, schedule_grade_start(%{state | tournament: merged_tournament})}
    end
  end

  def handle_call(:flush_persist, _from, state) do
    {:reply, :ok, flush_pending_persist(state)}
  end

  def handle_call(:freeze, _from, state) do
    {:reply, :ok, %{state | frozen: true}}
  end

  def handle_call(:unfreeze, _from, state) do
    {:reply, :ok, %{state | frozen: false}}
  end

  def handle_call(:export_state, _from, state) do
    state = flush_pending_persist(state)
    tournament = state.tournament

    snapshot = %{
      tournament: export_tournament_struct(tournament),
      ets: %{
        players: safe_tab2list(tournament.players_table),
        matches: safe_tab2list(tournament.matches_table),
        tasks: safe_tab2list(tournament.tasks_table),
        ranking: safe_tab2list(tournament.ranking_table),
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

    {:reply, :ok,
     schedule_grade_start(%{state | tournament: imported_tournament, frozen: false, restoring_players: false})}
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

  # Ladder: "Finish round" from the admin panel stops the games still playing and then
  # follows the ladder's own drain path instead of the swiss round-finish machinery: a
  # break of `break_duration_seconds` (whose end is published as `next_round_at`, so the
  # clients' countdown is right) after which the break-over tick opens the next round —
  # or, with no break or no rounds left, the tick runs right away.
  def handle_call({:fire_event, :finish_round, _params}, _from, %{tournament: %{type: "ladder"} = tournament} = state) do
    cond do
      state.frozen ->
        {:reply, {:error, :handoff_in_progress}, state}

      tournament.state != "active" or in_break?(tournament) or finished?(tournament) ->
        {:reply, tournament, state}

      true ->
        drained = tournament.module.finish_all_playing_matches(tournament)
        update_tournament_info_cache(drained)
        state = %{state | tournament: drained}

        {:noreply, new_state} =
          if drained.module.finish_tournament?(drained) or (drained.break_duration_seconds || 0) == 0 do
            run_ladder_tick_now(state)
          else
            start_ladder_break(state)
          end

        {:reply, new_state.tournament, new_state}
    end
  end

  def handle_call({:fire_event, :finish_round, _params}, _from, %{tournament: tournament} = state) do
    cond do
      state.frozen ->
        {:reply, {:error, :handoff_in_progress}, state}

      tournament.round_state == "round_finishing" or in_break?(tournament) or finished?(tournament) ->
        {:reply, tournament, state}

      true ->
        new_tournament = tournament.module.finish_all_playing_matches(tournament)
        update_tournament_info_cache(new_tournament)
        {:noreply, in_progress_state} = schedule_round_finish(%{state | tournament: new_tournament})
        {:reply, in_progress_state.tournament, in_progress_state}
    end
  end

  # Ladder: the UI "Start round" button (tournament:start_round → :start_round_force) runs a
  # matchmaking tick now instead of the generic round-start machinery ladder doesn't use.
  # Clears any active break, opens the next round immediately, and re-arms the periodic tick.
  def handle_call(
        {:fire_event, :start_round_force, _params},
        _from,
        %{tournament: %{type: "ladder"} = tournament} = state
      ) do
    cond do
      state.frozen ->
        {:reply, {:error, :handoff_in_progress}, state}

      finished?(tournament) ->
        {:reply, tournament, state}

      true ->
        cleared = Map.merge(tournament, %{break_state: "off", round_state: "active"})
        new_tournament = cleared.module.matchmaking_tick(cleared)
        update_tournament_info_cache(new_tournament)
        broadcast_tournament_update(new_tournament)
        new_state = arm_matchmaking_tick(%{state | tournament: new_tournament})
        {:reply, new_tournament, new_state}
    end
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

      new_tournament = if event_type == :restart, do: plan_ladder(new_tournament), else: new_tournament
      update_tournament_info_cache(new_tournament)

      new_state =
        event_type
        |> maybe_arm_matchmaking_tick(%{state | tournament: new_tournament})
        |> maybe_schedule_round_finish_after(event_type)
        |> maybe_close_empty_round(event_type)

      # TODO: rethink broadcasting during applying event, maybe put inside tournament module
      broadcast_tournament_event_by_type(event_type, params, new_tournament)

      {:reply, new_state.tournament, new_state}
    end
  end

  def handle_info(:start_grade_tournament, %{tournament: tournament} = state) do
    if state.frozen do
      defer_message(:start_grade_tournament, "start_grade_tournament", state)
    else
      cond do
        state.restoring_players ->
          {:noreply, state}

        DateTime.after?(tournament.starts_at, DateTime.utc_now()) ->
          {:noreply, schedule_grade_start(state)}

        true ->
          maybe_start_grade_tournament(tournament)
          {:noreply, state}
      end
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
           tournament.round_state != "round_finishing" and
           not in_break?(tournament) and
           not finished?(tournament) do
        new_tournament = tournament.module.finish_all_playing_matches(tournament)
        update_tournament_info_cache(new_tournament)
        schedule_round_finish(%{state | tournament: new_tournament})
      else
        {:noreply, %{state | tournament: tournament}}
      end
    end
  end

  def handle_info({:matchmaking_tick, round_position}, %{tournament: tournament} = state) do
    cond do
      state.frozen ->
        defer_message({:matchmaking_tick, round_position}, "matchmaking_tick", state)

      tournament.type != "ladder" or tournament.state != "active" ->
        {:noreply, state}

      tournament.current_round_position != round_position ->
        # Stale: a drain, break-over, or UI-forced tick already opened this round. Drop it —
        # that path re-armed a fresh tick for the current round, so the cadence is intact.
        {:noreply, state}

      not tournament.module.ticks_remaining?(tournament) ->
        # The final wave has its own one-shot deadline. A delayed regular tick must not
        # replace it or move that deadline further into the future.
        {:noreply, state}

      true ->
        state
        |> consume_matchmaking_timer()
        |> run_matchmaking_tick()
    end
  end

  def handle_info({:ladder_final_deadline, round_position}, %{tournament: tournament} = state) do
    cond do
      state.frozen ->
        defer_message(
          {:ladder_final_deadline, round_position},
          "ladder_final_deadline",
          state
        )

      tournament.type != "ladder" or tournament.state != "active" ->
        {:noreply, state}

      tournament.current_round_position != round_position ->
        {:noreply, state}

      tournament.module.ticks_remaining?(tournament) ->
        # The tournament was restored or changed after this deadline was armed.
        {:noreply, state}

      true ->
        new_tournament = tournament.module.finish_all_playing_matches(tournament)
        update_tournament_info_cache(new_tournament)

        state
        |> consume_matchmaking_timer()
        |> Map.put(:tournament, new_tournament)
        |> run_matchmaking_tick()
    end
  end

  def handle_info({:ladder_break_over, round_position}, %{tournament: tournament} = state) do
    if state.frozen do
      defer_message({:ladder_break_over, round_position}, "ladder_break_over", state)
    else
      if tournament.current_round_position == round_position and
           in_break?(tournament) and
           tournament.state == "active" and
           not finished?(tournament) do
        cleared = Map.merge(tournament, %{break_state: "off", round_state: "active"})
        new_tournament = cleared.module.matchmaking_tick(cleared)
        update_tournament_info_cache(new_tournament)
        broadcast_tournament_update(new_tournament)
        {:noreply, arm_matchmaking_tick(%{state | tournament: new_tournament})}
      else
        {:noreply, %{state | tournament: tournament}}
      end
    end
  end

  def handle_info(
        %{topic: "game:tournament:" <> _t_id, event: "game:tournament:finished", payload: payload} = message,
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
          retry_missing_match(message, state)

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

  # Join/leave/ban change only ETS; the full jsonb snapshot is written at most once per
  # debounce window instead of once per event (a batch join is a single save).
  def handle_info(:persist_requested, state) do
    Process.delete(:tournament_persist_requested)

    if Map.get(state, :persist_timer_ref) do
      {:noreply, state}
    else
      ref = Process.send_after(self(), :persist_snapshot, persist_debounce_ms())
      {:noreply, Map.put(state, :persist_timer_ref, ref)}
    end
  end

  def handle_info(:persist_snapshot, state) do
    {:noreply, persist_snapshot(%{state | persist_timer_ref: nil})}
  end

  def handle_info(:terminate, %{tournament: tournament} = state) do
    Tournament.GlobalSupervisor.terminate_tournament_async(tournament.id)
    {:noreply, state}
  end

  # Restore runs through this server's public API (import_state / handle_event), so it
  # must happen from another process once init has returned.
  def handle_info(:restore_after_crash, %{tournament: tournament} = state) do
    Logger.warning("Tournament #{tournament.id} restarted after crash, restoring state")
    tournament_id = tournament.id

    Task.start(fn ->
      tournament_id
      |> Tournament.Context.get_from_db!()
      |> Tournament.Context.restore_after_release()
    end)

    {:noreply, state}
  end

  def handle_info(_message, state) do
    {:noreply, state}
  end

  def tournament_topic_name(tournament_id), do: "tournament:#{tournament_id}"

  # Re-arm after edits and imports. Queued messages recheck starts_at so an old
  # timer cannot start a tournament early after its schedule changes.
  defp schedule_grade_start(%{tournament: tournament} = state) do
    if state.grade_start_timer_ref, do: Process.cancel_timer(state.grade_start_timer_ref)

    timer_ref =
      if tournament.grade != "open" and tournament.state == "waiting_participants" and
           not state.restoring_players do
        delay = max(DateTime.diff(tournament.starts_at, DateTime.utc_now(), :millisecond), 0)
        Process.send_after(self(), :start_grade_tournament, delay)
      end

    %{state | grade_start_timer_ref: timer_ref}
  end

  defp maybe_start_grade_tournament(%{grade: grade, state: "waiting_participants"} = tournament) when grade != "open" do
    event = if players_count(tournament) > 0, do: :start, else: :cancel
    cast_event(tournament.id, event, %{})
  end

  defp maybe_start_grade_tournament(_tournament), do: :noop

  defp retry_missing_match(%{payload: payload} = message, %{tournament: tournament} = state) do
    retries = Map.get(message, :retries, 0)

    if retries < @match_missing_max_retries do
      defer_message(
        %{
          topic: "game:tournament:#{tournament.id}",
          event: "game:tournament:finished",
          payload: payload,
          retries: retries + 1
        },
        "game_tournament_match_missing",
        state
      )
    else
      Logger.error("Tournament #{tournament.id}: dropping game finish for unknown match #{inspect(payload.ref)}")
      {:noreply, state}
    end
  end

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

  defp flush_pending_persist(state) do
    case Map.get(state, :persist_timer_ref) do
      nil ->
        state

      ref ->
        Process.cancel_timer(ref)
        persist_snapshot(%{state | persist_timer_ref: nil})
    end
  end

  # The returned struct carries the players/matches maps; keep them out of the state.
  defp persist_snapshot(%{tournament: tournament} = state) do
    Tournament.Context.upsert!(tournament, :with_ets)
    state
  rescue
    e ->
      Logger.error("Tournament #{tournament.id} snapshot save failed: #{Exception.message(e)}")
      state
  end

  defp persist_debounce_ms, do: Application.get_env(:codebattle, :tournament_persist_debounce_ms, 5_000)

  defp server_name(id), do: {:via, Registry, {Codebattle.Registry, "tournament_srv::#{id}"}}

  defp export_tournament_struct(tournament) do
    tournament
    |> Map.from_struct()
    |> Map.drop([
      :__meta__,
      :creator,
      :event,
      :players,
      :matches,
      :players_table,
      :matches_table,
      :tasks_table,
      :ranking_table
    ])
  end

  defp merge_snapshot_tournament(tournament, snapshot_tournament) do
    attrs = Map.drop(snapshot_tournament, [:players_table, :matches_table, :tasks_table, :ranking_table])

    struct(tournament, attrs)
  end

  defp load_ets_snapshot(tournament, ets_snapshot) do
    replace_table_rows(tournament.players_table, Map.get(ets_snapshot, :players, []))

    replace_table_rows(tournament.matches_table, Map.get(ets_snapshot, :matches, []))
    Tournament.Matches.rebuild_index(tournament)
    replace_table_rows(tournament.tasks_table, Map.get(ets_snapshot, :tasks, []))
    replace_table_rows(tournament.ranking_table, Map.get(ets_snapshot, :ranking, []))

    tournament
    |> Ranking.get_all()
    |> then(&Ranking.put_ranking(tournament, &1))

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

      {:noreply, close_empty_round(%{state | tournament: new_tournament, break_timer_expired: false})}
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
      {:noreply, close_empty_round(%{state | tournament: new_tournament, break_timer_expired: false})}
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

  # Ladder only: (re)arm the periodic matchmaking tick when the tournament (re)activates,
  # including after a crash/restart restore (R1) — the generic restore path is a no-op
  # under per_task, so without this the tick would be lost. Guarded by event type so it
  # only arms on (re)activation and on a UI-forced tick, not on every event (e.g. :join).
  defp maybe_arm_matchmaking_tick(event_type, state)
       when event_type in [:start, :restart, :retry, :restore_active_round, :restore_active_break] do
    arm_matchmaking_tick(state)
  end

  defp maybe_arm_matchmaking_tick(_event_type, state), do: state

  defp run_matchmaking_tick(%{tournament: tournament} = state) do
    new_tournament = tournament.module.matchmaking_tick(tournament)
    update_tournament_info_cache(new_tournament)
    # Re-arm the next tick (for the possibly-advanced round) only while still running.
    {:noreply, arm_matchmaking_tick(%{state | tournament: new_tournament})}
  end

  # Arm either the next matchmaking tick or, after the final tick has created its games,
  # one safety deadline. The final deadline follows the actual game timeout rather than the
  # matchmaking cadence and is not extended by repeated events in the same final wave.
  defp arm_matchmaking_tick(%{tournament: %{type: "ladder", state: "active"} = tournament} = state) do
    if tournament.module.ticks_remaining?(tournament) do
      arm_ladder_timer(state, :matchmaking_tick, {:matchmaking_tick, tournament.current_round_position})
    else
      arm_ladder_final_deadline(state, tournament)
    end
  end

  defp arm_matchmaking_tick(%{tournament: %{type: "ladder"}} = state) do
    clear_matchmaking_timer(state)
  end

  defp arm_matchmaking_tick(state), do: state

  defp arm_ladder_final_deadline(state, tournament) do
    if Map.get(state, :matchmaking_timer_kind) == :final_deadline and
         Map.get(state, :matchmaking_timer_ref) do
      state
    else
      arm_ladder_timer(state, :final_deadline, {:ladder_final_deadline, tournament.current_round_position})
    end
  end

  # The timer fires at the tournament's `next_round_at`, which clients count down to. During a
  # break the break-over message opens the next round, so a periodic tick re-armed mid-break
  # runs on its own interval and must not move the break-end countdown.
  defp arm_ladder_timer(%{tournament: tournament} = state, kind, message) do
    state = clear_matchmaking_timer(state)
    tournament = ensure_round_durations(tournament)

    interval_ms = tournament.module.next_timer_seconds(tournament) * 1000
    now = DateTime.utc_now(:millisecond)

    {tournament, delay_ms} =
      if in_break?(tournament) do
        {tournament, interval_ms}
      else
        target = next_round_target(tournament.next_round_at, now, interval_ms)
        tournament = Map.put(tournament, :next_round_at, target)
        update_tournament_info_cache(tournament)
        {tournament, DateTime.diff(target, now, :millisecond)}
      end

    ref = Process.send_after(self(), message, delay_ms)

    Map.merge(state, %{
      tournament: tournament,
      matchmaking_timer_ref: ref,
      matchmaking_timer_kind: kind,
      next_matchmaking_tick_at: System.monotonic_time(:millisecond) + delay_ms
    })
  end

  # The schedule is virtual: rebuild it from the round tasks after a crash restore.
  defp ensure_round_durations(%{round_durations: [_ | _]} = tournament), do: tournament

  defp ensure_round_durations(%{task_ids: task_ids} = tournament) when is_list(task_ids) do
    Map.put(tournament, :round_durations, tournament.module.round_durations(tournament))
  end

  defp ensure_round_durations(tournament), do: tournament

  # Plan a waiting ladder's schedule up front so the join page can show it. Reads the task
  # pack from the database, so it only runs on boot, on edits and on restart.
  defp plan_ladder(%{type: "ladder", state: "waiting_participants"} = tournament) do
    Map.put(tournament, :round_durations, tournament.module.planned_round_durations(tournament))
  rescue
    error ->
      Logger.warning("Tournament #{tournament.id}: cannot plan the ladder schedule: #{Exception.message(error)}")
      tournament
  end

  defp plan_ladder(tournament), do: tournament

  # A round the ladder just opened was stamped (and broadcast) with its next_round_at: keep
  # it. A tick that opened nothing (nobody idle) broadcasts nothing and leaves the fired
  # target in the past: advance it by whole intervals, so the cadence never drifts and
  # clients can extrapolate it exactly. Anything else (restore, missing) starts from now.
  defp next_round_target(%DateTime{} = target, now, interval_ms) do
    ahead_ms = DateTime.diff(target, now, :millisecond)

    cond do
      ahead_ms > 0 and ahead_ms <= interval_ms ->
        target

      ahead_ms <= 0 and -ahead_ms < interval_ms * 10 ->
        DateTime.add(target, (div(-ahead_ms, interval_ms) + 1) * interval_ms, :millisecond)

      true ->
        DateTime.add(now, interval_ms, :millisecond)
    end
  end

  defp next_round_target(_target, now, interval_ms), do: DateTime.add(now, interval_ms, :millisecond)

  defp consume_matchmaking_timer(state) do
    Map.merge(state, %{
      matchmaking_timer_ref: nil,
      matchmaking_timer_kind: nil,
      next_matchmaking_tick_at: nil
    })
  end

  defp clear_matchmaking_timer(state) do
    if ref = Map.get(state, :matchmaking_timer_ref), do: Process.cancel_timer(ref)
    consume_matchmaking_timer(state)
  end

  # Excluding a player or closing a match by hand can leave the current round with nothing
  # left to wait for, and no game-finished event will come to finish it. Re-check here.
  defp maybe_schedule_round_finish_after(%{tournament: tournament} = state, event_type)
       when event_type in @round_closing_events do
    if tournament.state == "active" and tournament.type != "ladder" and not in_break?(tournament) and
         get_round_matches(tournament, tournament.current_round_position) != [] and
         should_schedule_round_finish?(tournament) do
      {:noreply, new_state} = schedule_round_finish(state)
      new_state
    else
      state
    end
  end

  defp maybe_schedule_round_finish_after(state, _event_type), do: state

  # Swiss rounds have no timer of their own: a round closes when its last game does. A round
  # that has no games at all (everyone joined after it was paired) would therefore never
  # close, so close it now — the break follows and the next round pairs the waiting players.
  defp maybe_close_empty_round(state, event_type) when event_type in [:start, :join], do: close_empty_round(state)
  defp maybe_close_empty_round(state, _event_type), do: state

  defp close_empty_round(%{tournament: tournament} = state) do
    if empty_round_with_waiting_players?(tournament) do
      {:noreply, new_state} = schedule_round_finish(state)
      new_state
    else
      state
    end
  end

  defp empty_round_with_waiting_players?(tournament) do
    tournament.type != "ladder" and tournament.state == "active" and not in_break?(tournament) and
      tournament.round_state != "round_finishing" and
      get_round_matches(tournament, tournament.current_round_position) == [] and
      tournament |> get_players() |> Enum.any?(&(not &1.is_bot and &1.state != "banned"))
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

  # Ladder games from earlier ticks finish while a later tick is current, so the
  # round_position guard used by other types would silently drop them. Ladder has no
  # break cycle and never auto-finishes a round, so just record the result; the server
  # then decides what to do once the playing pool has drained (see maybe_drain_ladder_wave).
  defp maybe_finish_live_match(state, %{type: "ladder"} = tournament, match, payload) do
    if finished?(tournament) do
      {:noreply, %{state | tournament: tournament}}
    else
      # finish_match records the result and broadcasts the wait overlay (maybe_create_rematch);
      # the server drives what happens once the playing pool has drained.
      new_tournament = tournament.module.finish_match(tournament, Map.put(payload, :game_id, match.game_id))
      update_tournament_info_cache(new_tournament)
      maybe_drain_ladder_wave(%{state | tournament: new_tournament})
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

  # A wave has games still playing — nothing to do; wait for them to finish. Otherwise the
  # pool has drained and the next round may open early — but never later than planned, so
  # the published schedule stays an upper bound: without a break tick now; with one, insert
  # it only when it ends before the scheduled tick, else simply let that tick open the round.
  defp maybe_drain_ladder_wave(%{tournament: tournament} = state) do
    break_ms = (tournament.break_duration_seconds || 0) * 1000

    cond do
      playing_matches?(tournament) ->
        {:noreply, state}

      tournament.module.finish_tournament?(tournament) ->
        # Final drain, or nobody left to pair: the tick finishes the tournament, no break.
        run_ladder_tick_now(state)

      break_ms == 0 ->
        run_ladder_tick_now(state)

      ms_to_next_tick(state) > break_ms + @ladder_min_break_gap_ms ->
        start_ladder_break(state)

      true ->
        {:noreply, state}
    end
  end

  defp ms_to_next_tick(%{next_matchmaking_tick_at: nil}), do: 0
  defp ms_to_next_tick(%{next_matchmaking_tick_at: next_at}), do: next_at - System.monotonic_time(:millisecond)

  defp run_ladder_tick_now(%{tournament: tournament} = state) do
    new_tournament = tournament.module.matchmaking_tick(tournament)
    update_tournament_info_cache(new_tournament)
    # Re-arm the periodic tick for the (advanced) round, cancelling the previous round's
    # pending tick so a stale timer can't tick this round a second time.
    {:noreply, arm_matchmaking_tick(%{state | tournament: new_tournament})}
  end

  defp start_ladder_break(%{tournament: tournament} = state) do
    break_seconds = tournament.break_duration_seconds

    Process.send_after(
      self(),
      {:ladder_break_over, tournament.current_round_position},
      to_timeout(second: break_seconds)
    )

    new_tournament =
      Map.merge(tournament, %{
        break_state: "on",
        last_round_ended_at: NaiveDateTime.utc_now(:second),
        next_round_at: tournament.module.next_round_at(tournament, break_seconds),
        round_state: "break"
      })

    update_tournament_info_cache(new_tournament)
    tournament.module.broadcast_round_finished(new_tournament)

    {:noreply, %{state | tournament: new_tournament}}
  end
end
