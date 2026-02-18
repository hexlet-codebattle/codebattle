defmodule Codebattle.Deployment do
  @moduledoc false

  alias Codebattle.Bot
  alias Codebattle.Cluster
  alias Codebattle.Game
  alias Codebattle.Tournament

  require Logger

  @drain_key {:codebattle, :draining}
  @handoff_lock_name {:codebattle, :handoff_lock}
  @handoff_wait_timeout_ms 15_000
  @handoff_epoch_table :handoff_ownership_epochs

  def draining? do
    case :persistent_term.get(@drain_key, nil) do
      nil -> System.get_env("DRAIN_MODE", "false") == "true"
      value -> value
    end
  end

  def set_draining(value) when is_boolean(value) do
    :persistent_term.put(@drain_key, value)
    :ok
  end

  def runtime_counts do
    %{
      games: Enum.count(Game.Context.get_active_games()),
      tournaments: Enum.count(Tournament.Context.get_live_tournaments())
    }
  rescue
    _ ->
      %{games: 0, tournaments: 0}
  end

  def safe_to_stop? do
    %{games: games, tournaments: tournaments} = runtime_counts()
    games == 0 and tournaments == 0
  end

  def handoff_active_runtime do
    handoff_id = System.unique_integer([:positive, :monotonic])
    base_ctx = base_handoff_context(handoff_id)

    step_info(base_ctx, "handoff_started", "ok", %{counts: runtime_counts()})

    case acquire_handoff_lock(base_ctx) do
      :ok ->
        try do
          do_handoff(base_ctx)
        after
          release_handoff_lock(base_ctx)
        end

      {:error, :handoff_in_progress} ->
        step_warning(base_ctx, "handoff_lock", "skipped", %{reason: :handoff_in_progress})

        %{
          status: "handoff_in_progress",
          handoff_id: handoff_id,
          target_node: nil,
          tournaments: %{migrated: [], failed: []},
          games: %{migrated: [], failed: []}
        }
    end
  end

  def import_tournament_snapshot(snapshot) when is_map(snapshot) do
    meta = Map.get(snapshot, :handoff_meta, %{})
    ctx = context_from_meta(meta)

    tournament_snapshot = Map.get(snapshot, :tournament, %{})
    tournament_id = Map.get(tournament_snapshot, :id)

    ctx = Map.merge(ctx, %{entity_type: "tournament", entity_id: tournament_id})
    step_info(ctx, "import_tournament_snapshot_started", "ok", %{})

    with true <- is_integer(tournament_id),
         :ok <- accept_handoff_epoch(meta),
         tournament when not is_nil(tournament) <- Tournament.Context.get_from_db(tournament_id),
         :ok <- ensure_tournament_started(tournament),
         :ok <- Tournament.Server.import_state(tournament_id, snapshot) do
      step_info(ctx, "import_tournament_snapshot_finished", "ok", %{})
      {:ok, %{id: tournament_id}}
    else
      false ->
        step_error(ctx, "import_tournament_snapshot_invalid", "error", %{reason: :invalid_tournament_snapshot})
        {:error, :invalid_tournament_snapshot}

      nil ->
        step_error(ctx, "import_tournament_snapshot_not_found", "error", %{reason: :tournament_not_found})
        {:error, :tournament_not_found}

      {:error, reason} ->
        step_error(ctx, "import_tournament_snapshot_error", "error", %{reason: inspect(reason)})
        {:error, reason}

      other ->
        step_error(ctx, "import_tournament_snapshot_unexpected", "error", %{reason: inspect(other)})
        {:error, other}
    end
  end

  def import_game_snapshot(snapshot) when is_map(snapshot) do
    meta = Map.get(snapshot, :handoff_meta, %{})
    ctx = context_from_meta(meta)

    game_snapshot = Map.get(snapshot, :game, %{})
    game = Map.get(game_snapshot, :game)
    game_id = Map.get(game || %{}, :id)

    ctx = Map.merge(ctx, %{entity_type: "game", entity_id: game_id})
    step_info(ctx, "import_game_snapshot_started", "ok", %{})

    with true <- is_map(game),
         true <- is_integer(game_id),
         :ok <- accept_handoff_epoch(meta),
         :ok <- ensure_game_started(game),
         :ok <- Game.Server.import_state(game_id, game_snapshot),
         :ok <- import_timeout_snapshot(game_id, Map.get(snapshot, :timeout, %{})),
         :ok <- maybe_restart_bots(game),
         :ok <- Game.Server.unfreeze(game_id) do
      step_info(ctx, "import_game_snapshot_finished", "ok", %{})
      {:ok, %{id: game_id}}
    else
      false ->
        step_error(ctx, "import_game_snapshot_invalid", "error", %{reason: :invalid_game_snapshot})
        {:error, :invalid_game_snapshot}

      {:error, reason} ->
        step_error(ctx, "import_game_snapshot_error", "error", %{reason: inspect(reason)})
        {:error, reason}

      other ->
        step_error(ctx, "import_game_snapshot_unexpected", "error", %{reason: inspect(other)})
        {:error, other}
    end
  end

  defp do_handoff(base_ctx) do
    case run_step(base_ctx, "target_select", fn -> Cluster.wait_for_target_node(@handoff_wait_timeout_ms) end) do
      nil ->
        step_warning(base_ctx, "handoff_no_target_node", "skipped", %{
          connected_nodes: Enum.map(Cluster.connected_nodes(), &Atom.to_string/1)
        })

        %{
          status: "no_target_node",
          handoff_id: base_ctx.handoff_id,
          target_node: nil,
          tournaments: %{migrated: [], failed: []},
          games: %{migrated: [], failed: []}
        }

      target_node when is_atom(target_node) ->
        handoff_ctx = %{base_ctx | target_node: Atom.to_string(target_node)}

        with :ok <- notify_handoff_started(handoff_ctx),
             tournament_report = migrate_tournaments(handoff_ctx, target_node),
             game_report = migrate_games(handoff_ctx, target_node),
             :ok <- notify_handoff_finished(handoff_ctx, tournament_report, game_report) do
          step_info(handoff_ctx, "handoff_finished", "ok", %{
            tournaments: tournament_report,
            games: game_report
          })

          %{
            status: "ok",
            handoff_id: base_ctx.handoff_id,
            target_node: Atom.to_string(target_node),
            tournaments: tournament_report,
            games: game_report
          }
        else
          {:error, reason} ->
            step_error(handoff_ctx, "handoff_failed", "error", %{reason: inspect(reason)})
            notify_handoff_failed(handoff_ctx, reason)

            %{
              status: "error",
              handoff_id: base_ctx.handoff_id,
              reason: inspect(reason),
              tournaments: %{migrated: [], failed: []},
              games: %{migrated: [], failed: []}
            }
        end
    end
  end

  defp migrate_tournaments(base_ctx, target_node) do
    report_start = monotonic_now_ms()

    report =
      Tournament.Context.get_live_tournaments()
      |> Enum.reduce(%{migrated: [], failed: []}, fn tournament, acc ->
        entity_ctx = %{
          base_ctx
          | entity_type: "tournament",
            entity_id: tournament.id
        }

        case migrate_tournament(entity_ctx, target_node) do
          :ok -> %{acc | migrated: [tournament.id | acc.migrated]}
          {:error, reason} -> %{acc | failed: [%{id: tournament.id, reason: inspect(reason)} | acc.failed]}
        end
      end)
      |> reverse_report()

    step_info(base_ctx, "migrate_tournaments", "ok", %{report: report}, report_start)
    report
  end

  defp migrate_games(base_ctx, target_node) do
    report_start = monotonic_now_ms()

    report =
      Game.Context.get_active_games()
      |> Enum.reduce(%{migrated: [], failed: []}, fn game, acc ->
        entity_ctx = %{
          base_ctx
          | entity_type: "game",
            entity_id: game.id
        }

        case migrate_game(entity_ctx, target_node) do
          :ok -> %{acc | migrated: [game.id | acc.migrated]}
          {:error, reason} -> %{acc | failed: [%{id: game.id, reason: inspect(reason)} | acc.failed]}
        end
      end)
      |> reverse_report()

    step_info(base_ctx, "migrate_games", "ok", %{report: report}, report_start)
    report
  end

  defp migrate_tournament(ctx, target_node) do
    epoch = next_handoff_epoch()
    meta = build_meta(ctx, epoch, "tournament", ctx.entity_id, target_node)

    with :ok <- run_step(ctx, "freeze", fn -> Tournament.Server.freeze(ctx.entity_id) end),
         {:ok, snapshot} <- run_step(ctx, "export", fn -> Tournament.Server.export_state(ctx.entity_id) end),
         {:ok, _result} <-
           run_step(ctx, "import", fn ->
             rpc_import_tournament(ctx, target_node, Map.put(snapshot, :handoff_meta, meta))
           end),
         :ok <- run_step(ctx, "terminate_source", fn -> terminate_tournament(ctx.entity_id) end) do
      step_info(ctx, "migrate_tournament_finished", "ok", %{epoch: epoch})
      :ok
    else
      {:error, reason} ->
        _ = Tournament.Server.unfreeze(ctx.entity_id)
        step_error(ctx, "migrate_tournament_failed", "error", %{reason: inspect(reason), epoch: epoch})
        {:error, reason}

      other ->
        _ = Tournament.Server.unfreeze(ctx.entity_id)
        step_error(ctx, "migrate_tournament_failed", "error", %{reason: inspect(other), epoch: epoch})
        {:error, other}
    end
  end

  defp migrate_game(ctx, target_node) do
    epoch = next_handoff_epoch()
    meta = build_meta(ctx, epoch, "game", ctx.entity_id, target_node)

    with :ok <- run_step(ctx, "freeze", fn -> Game.Server.freeze(ctx.entity_id) end),
         {:ok, game_snapshot} <- run_step(ctx, "export", fn -> Game.Server.export_state(ctx.entity_id) end),
         timeout_snapshot = Game.TimeoutServer.get_snapshot(ctx.entity_id),
         snapshot = %{game: game_snapshot, timeout: timeout_snapshot, handoff_meta: meta},
         {:ok, _result} <- run_step(ctx, "import", fn -> rpc_import_game(ctx, target_node, snapshot) end),
         :ok <- run_step(ctx, "terminate_source", fn -> terminate_game(ctx.entity_id) end) do
      step_info(ctx, "migrate_game_finished", "ok", %{epoch: epoch})
      :ok
    else
      {:error, reason} ->
        _ = Game.Server.unfreeze(ctx.entity_id)
        step_error(ctx, "migrate_game_failed", "error", %{reason: inspect(reason), epoch: epoch})
        {:error, reason}

      other ->
        _ = Game.Server.unfreeze(ctx.entity_id)
        step_error(ctx, "migrate_game_failed", "error", %{reason: inspect(other), epoch: epoch})
        {:error, other}
    end
  end

  defp rpc_import_tournament(ctx, target_node, snapshot) do
    run_step(ctx, "rpc_import_tournament", fn ->
      case :rpc.call(target_node, __MODULE__, :import_tournament_snapshot, [snapshot], 30_000) do
        {:ok, _} = result -> result
        {:badrpc, reason} -> {:error, reason}
        other -> {:error, other}
      end
    end)
  end

  defp rpc_import_game(ctx, target_node, snapshot) do
    run_step(ctx, "rpc_import_game", fn ->
      case :rpc.call(target_node, __MODULE__, :import_game_snapshot, [snapshot], 30_000) do
        {:ok, _} = result -> result
        {:badrpc, reason} -> {:error, reason}
        other -> {:error, other}
      end
    end)
  end

  defp ensure_tournament_started(tournament) do
    case Tournament.GlobalSupervisor.start_tournament(tournament) do
      {:ok, _pid} -> :ok
      {:error, {:already_started, _pid}} -> :ok
      {:error, {:already_present, _child}} -> :ok
      {:error, reason} -> {:error, reason}
    end
  end

  defp ensure_game_started(game) do
    case Game.GlobalSupervisor.start_game(game) do
      {:ok, _pid} -> :ok
      {:error, {:already_started, _pid}} -> :ok
      {:error, {:already_present, _child}} -> :ok
      {:error, reason} -> {:error, reason}
    end
  end

  defp import_timeout_snapshot(game_id, snapshot) when is_map(snapshot) do
    Game.TimeoutServer.import_snapshot(game_id, snapshot)
    :ok
  end

  defp import_timeout_snapshot(_game_id, _snapshot), do: :ok

  defp maybe_restart_bots(game) do
    Bot.Context.start_bots(game)
    :ok
  rescue
    _e -> :ok
  end

  defp terminate_tournament(tournament_id) do
    Tournament.GlobalSupervisor.terminate_tournament(tournament_id)
    :ok
  rescue
    _e -> :ok
  end

  defp terminate_game(game_id) do
    Game.GlobalSupervisor.terminate_game(game_id)
    :ok
  rescue
    _e -> :ok
  end

  defp acquire_handoff_lock(ctx) do
    case :global.register_name(@handoff_lock_name, self()) do
      :yes ->
        step_info(ctx, "handoff_lock", "acquired", %{})
        :ok

      :no ->
        {:error, :handoff_in_progress}

      other ->
        step_warning(ctx, "handoff_lock", "skipped", %{reason: inspect(other)})
        {:error, :handoff_in_progress}
    end
  end

  defp release_handoff_lock(ctx) do
    if :global.whereis_name(@handoff_lock_name) == self() do
      :global.unregister_name(@handoff_lock_name)
      step_info(ctx, "handoff_lock", "released", %{})
    end

    :ok
  end

  defp reverse_report(report) do
    %{
      migrated: Enum.reverse(report.migrated),
      failed: Enum.reverse(report.failed)
    }
  end

  defp notify_handoff_started(ctx) do
    run_step(ctx, "notify_handoff_started", fn ->
      Codebattle.PubSub.broadcast("deploy:handoff_started", %{
        handoff_id: ctx.handoff_id,
        target_node: ctx.target_node,
        counts: runtime_counts()
      })

      :ok
    end)
  end

  defp notify_handoff_finished(ctx, tournaments, games) do
    run_step(ctx, "notify_handoff_finished", fn ->
      Codebattle.PubSub.broadcast("deploy:handoff_done", %{
        handoff_id: ctx.handoff_id,
        target_node: ctx.target_node,
        tournaments: tournaments,
        games: games
      })

      :ok
    end)
  end

  defp notify_handoff_failed(ctx, reason) do
    run_step(ctx, "notify_handoff_failed", fn ->
      Codebattle.PubSub.broadcast("deploy:handoff_failed", %{
        handoff_id: ctx.handoff_id,
        reason: inspect(reason),
        counts: runtime_counts()
      })

      :ok
    end)
  end

  defp accept_handoff_epoch(meta) do
    with entity_type when is_binary(entity_type) <- Map.get(meta, :entity_type),
         entity_id when is_integer(entity_id) <- Map.get(meta, :entity_id),
         epoch when is_integer(epoch) <- Map.get(meta, :epoch) do
      ensure_epoch_table()

      key = {entity_type, entity_id}

      current_epoch =
        case :ets.lookup(@handoff_epoch_table, key) do
          [{^key, stored_epoch}] -> stored_epoch
          _ -> 0
        end

      if epoch > current_epoch do
        true = :ets.insert(@handoff_epoch_table, {key, epoch})
        :ok
      else
        {:error, :stale_handoff_epoch}
      end
    else
      _ -> {:error, :invalid_handoff_meta}
    end
  end

  defp ensure_epoch_table do
    case :ets.whereis(@handoff_epoch_table) do
      :undefined ->
        :ets.new(@handoff_epoch_table, [
          :named_table,
          :public,
          :set,
          {:read_concurrency, true},
          {:write_concurrency, true}
        ])

      _table ->
        :ok
    end

    :ok
  end

  defp next_handoff_epoch do
    System.unique_integer([:positive, :monotonic])
  end

  defp build_meta(ctx, epoch, entity_type, entity_id, target_node) do
    %{
      handoff_id: ctx.handoff_id,
      epoch: epoch,
      entity_type: entity_type,
      entity_id: entity_id,
      source_node: Atom.to_string(node()),
      target_node: Atom.to_string(target_node),
      exported_at: DateTime.utc_now() |> DateTime.truncate(:second) |> DateTime.to_iso8601()
    }
  end

  defp run_step(ctx, phase, fun) do
    started_at = monotonic_now_ms()

    result =
      try do
        fun.()
      rescue
        error -> {:error, error}
      catch
        kind, reason -> {:error, {kind, reason}}
      end

    case result do
      :ok ->
        step_info(ctx, phase, "ok", %{}, started_at)
        :ok

      {:ok, _} = ok_result ->
        step_info(ctx, phase, "ok", %{}, started_at)
        ok_result

      nil ->
        step_warning(ctx, phase, "empty", %{}, started_at)
        nil

      {:error, reason} = error_result ->
        step_error(ctx, phase, "error", %{reason: inspect(reason)}, started_at)
        error_result

      other ->
        step_info(ctx, phase, "ok", %{value: inspect(other)}, started_at)
        other
    end
  end

  defp base_handoff_context(handoff_id) do
    %{
      handoff_id: handoff_id,
      entity_type: nil,
      entity_id: nil,
      source_node: Atom.to_string(node()),
      target_node: nil
    }
  end

  defp context_from_meta(meta) do
    %{
      handoff_id: Map.get(meta, :handoff_id),
      entity_type: Map.get(meta, :entity_type),
      entity_id: Map.get(meta, :entity_id),
      source_node: Map.get(meta, :source_node),
      target_node: Map.get(meta, :target_node)
    }
  end

  defp step_info(ctx, phase, result, details, started_at \\ nil) do
    payload = step_payload(ctx, phase, result, details, started_at)
    Logger.info("[handoff] #{inspect(payload, limit: :infinity, printable_limit: :infinity)}")
    telemetry(:ok, payload)
  end

  defp step_warning(ctx, phase, result, details, started_at \\ nil) do
    payload = step_payload(ctx, phase, result, details, started_at)
    Logger.warning("[handoff] #{inspect(payload, limit: :infinity, printable_limit: :infinity)}")
    telemetry(:warning, payload)
  end

  defp step_error(ctx, phase, result, details, started_at \\ nil) do
    payload = step_payload(ctx, phase, result, details, started_at)
    Logger.error("[handoff] #{inspect(payload, limit: :infinity, printable_limit: :infinity)}")
    telemetry(:error, payload)
  end

  defp step_payload(ctx, phase, result, details, started_at) do
    duration_ms =
      if is_integer(started_at) do
        monotonic_now_ms() - started_at
      end

    %{
      handoff_id: ctx.handoff_id,
      phase: phase,
      result: result,
      duration_ms: duration_ms,
      entity_type: ctx.entity_type,
      entity_id: ctx.entity_id,
      source_node: ctx.source_node,
      target_node: ctx.target_node,
      details: details
    }
  end

  defp telemetry(level, payload) do
    :telemetry.execute(
      [:codebattle, :deployment, :handoff, :step],
      %{count: 1, duration_ms: payload.duration_ms || 0},
      Map.put(payload, :level, level)
    )
  rescue
    _ -> :ok
  end

  defp monotonic_now_ms do
    System.monotonic_time(:millisecond)
  end
end
