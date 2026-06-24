defmodule Codebattle.Tournament.Simulator do
  @moduledoc """
  Tournament simulation driver for Top200 strategy.

  One simulator process per tournament. The process:
    * listens to the per-tournament PubSub topic for new matches
    * for each live match it picks a winner (rating-weighted) and a randomized
      "think time" (delay) window. The winner then *types* the solution into
      the editor line by line over that window — broadcasting each partial text
      to spectators exactly like a real player — and only submits the full,
      correct solution for checking at the very end of the window.
    * exposes start/pause/resume/retry/stop/update_settings API for the
      admin stream LiveView controls

  Submitted solutions are read from `Codebattle.Task.solutions["python"]`.
  Matches whose tasks have no python solution are logged and skipped.

  ## Killswitch

  The `:enable_simulator_bots` feature flag globally gates the bots. It is OFF by
  default, so bots do **not** type or submit until the flag is explicitly enabled
  (from `/feature-flags`). Disabling it again stops bots across all simulated
  tournaments — including tasks already mid-typing — while leaving the tournaments
  themselves untouched.
  """

  use GenServer

  alias Codebattle.Game
  alias Codebattle.PubSub
  alias Codebattle.Repo
  alias Codebattle.Tournament
  alias Codebattle.Tournament.Helpers
  alias Codebattle.Tournament.Simulator.Setup
  alias Codebattle.Tournament.Simulator.Supervisor, as: SimSup
  alias Codebattle.User

  require Logger

  # Minimum gap between two consecutive "typed" lines. Keeps very long solutions
  # from spamming sub-frame editor updates inside a short think window.
  @min_type_interval_ms 120

  # Tiny delay before the typing task is kicked off, so the scheduling stays
  # timer-based (and therefore cancellable) like the rest of the simulator.
  @start_delay_ms 1

  # Extra slack added on top of `tournament_rematch_timeout_ms` before re-scanning,
  # so the rematch game is already created/persisted when we look for it.
  @rescan_buffer_ms 300

  # Global gate for the bots. OFF by default: bots only type/submit when the
  # `:enable_simulator_bots` feature flag is enabled. Disabling it stops bots for
  # every simulated tournament — without finishing or otherwise touching the
  # tournaments themselves. Toggle it live from `/feature-flags`.
  @bots_flag :enable_simulator_bots

  @default_settings %{
    avg_seconds: 8.0,
    jitter_pct: 60.0,
    win_skew: 0.7,
    submit_loser_broken: false
  }

  @type settings :: %{
          avg_seconds: float(),
          jitter_pct: float(),
          win_skew: float(),
          submit_loser_broken: boolean()
        }

  # PUBLIC API

  @doc "Ensure a simulator process is alive for the given tournament."
  def ensure_started(tournament_id) when is_integer(tournament_id) do
    case SimSup.start_child(tournament_id) do
      {:ok, pid} -> {:ok, pid}
      {:error, {:already_started, pid}} -> {:ok, pid}
      other -> other
    end
  end

  @spec start(integer()) :: :ok | {:error, term()}
  def start(tournament_id), do: call(tournament_id, :start)

  @spec retry(integer()) :: :ok | {:error, term()}
  def retry(tournament_id), do: call(tournament_id, :retry)

  @doc """
  Gracefully stop the bots WITHOUT finishing the tournament.

  Cancels all pending typing timers and idles the simulator, so no further
  typing or submitting happens. The tournament and the simulator process are
  left alive; call `resume/1` to pick scheduling back up.
  """
  @spec pause(integer()) :: :ok | {:error, term()}
  def pause(tournament_id), do: call(tournament_id, :pause)

  @doc "Resume bots after `pause/1`: re-scan live games and continue scheduling."
  @spec resume(integer()) :: :ok | {:error, term()}
  def resume(tournament_id), do: call(tournament_id, :resume)

  @spec stop(integer()) :: :ok
  def stop(tournament_id) do
    # Finish the tournament gracefully (state -> "finished" or "timeout"+force);
    # then kill the simulator process. Failure on either side is non-fatal.
    Logger.info("simulator(#{tournament_id}): stop — finishing tournament")
    Tournament.Server.handle_event(tournament_id, :finish_tournament, %{})

    case Registry.lookup(Codebattle.Registry, registry_key(tournament_id)) do
      [{pid, _}] -> GenServer.stop(pid, :normal)
      _ -> :ok
    end
  end

  @spec update_settings(integer(), map()) :: :ok | {:error, term()}
  def update_settings(tournament_id, attrs) when is_map(attrs) do
    call(tournament_id, {:update_settings, attrs})
  end

  @spec get_state(integer()) :: %{status: atom(), settings: settings()} | nil
  def get_state(tournament_id) do
    case Registry.lookup(Codebattle.Registry, registry_key(tournament_id)) do
      [{pid, _}] -> GenServer.call(pid, :get_state, 5000)
      _ -> nil
    end
  catch
    :exit, _ -> nil
  end

  def default_settings, do: @default_settings

  @doc "Whether the global `:enable_simulator_bots` killswitch is on (bots allowed)."
  @spec bots_globally_enabled?() :: boolean()
  def bots_globally_enabled?, do: FunWithFlags.enabled?(@bots_flag)

  # GENSERVER

  def start_link(tournament_id) do
    GenServer.start_link(__MODULE__, tournament_id, name: via(tournament_id))
  end

  @impl true
  def init(tournament_id) do
    PubSub.subscribe("tournament:#{tournament_id}")
    PubSub.subscribe("tournament:#{tournament_id}:common")

    state = %{
      tournament_id: tournament_id,
      status: :idle,
      settings: @default_settings,
      scheduled_games: MapSet.new(),
      pair_winners: %{},
      timers: %{},
      rescan_timer: nil,
      # monitor_ref => pid of in-flight typing tasks, so pause/stop can kill bots
      # that are mid-typing (not just cancel not-yet-fired timers).
      typing: %{}
    }

    {:ok, state}
  end

  @impl true
  def handle_call(:start, _from, state) do
    Logger.info("simulator(#{state.tournament_id}): start (settings=#{inspect(state.settings)})")
    # Starting the simulator opts the tournament into simulation, even if it was
    # created without `meta.simulator` — so bots can be started from the stream
    # page for any tournament. `bots_active?` then sees the meta and runs.
    ensure_simulator_meta(state)
    state = ensure_tournament_started(state)
    state = %{state | status: :running}
    state = scan_and_schedule(state)
    Logger.info("simulator(#{state.tournament_id}): running scheduled=#{MapSet.size(state.scheduled_games)}")
    {:reply, :ok, state}
  end

  def handle_call(:retry, _from, state) do
    Logger.info("simulator(#{state.tournament_id}): retry — resetting tournament to waiting_participants")
    state = cancel_all_timers(state)

    with %{} = tournament <- get_tournament(state.tournament_id),
         %User{} = creator <- get_creator(tournament) do
      # Step 1: reset matches/results, drop tournament back to waiting_participants
      Tournament.Server.handle_event(state.tournament_id, :retry, %{user: creator})

      # Step 2: re-join any of the 200 simulator users that were dropped
      case Setup.top_up_players(state.tournament_id) do
        :ok ->
          :ok

        other ->
          Logger.warning("simulator(#{state.tournament_id}): top_up_players returned #{inspect(other)}")
      end

      # Step 3: start the tournament again
      Tournament.Server.handle_event(state.tournament_id, :start, %{user: creator})
    else
      _ -> :noop
    end

    state = scan_and_schedule(%{state | scheduled_games: MapSet.new(), pair_winners: %{}, status: :running})

    {:reply, :ok, state}
  end

  def handle_call(:pause, _from, state) do
    Logger.info("simulator(#{state.tournament_id}): pause — stopping bots, tournament left running")
    state = cancel_all_timers(%{state | scheduled_games: MapSet.new()})
    {:reply, :ok, %{state | status: :idle}}
  end

  def handle_call(:resume, _from, state) do
    Logger.info("simulator(#{state.tournament_id}): resume — re-scanning live games")
    state = scan_and_schedule(%{state | status: :running})
    {:reply, :ok, state}
  end

  def handle_call({:update_settings, attrs}, _from, state) do
    new_settings = merge_settings(state.settings, attrs)
    {:reply, :ok, %{state | settings: new_settings}}
  end

  def handle_call(:get_state, _from, state) do
    public = %{
      status: state.status,
      settings: state.settings,
      scheduled_count: MapSet.size(state.scheduled_games)
    }

    {:reply, public, state}
  end

  @impl true
  def handle_info(%{event: "tournament:round_created"}, %{status: :running} = state) do
    {:noreply, scan_and_schedule(state)}
  end

  def handle_info(%{event: "tournament:match:upserted", payload: payload}, %{status: :running} = state) do
    match = Map.get(payload, :match) || Map.get(payload, "match")

    case match do
      %{state: "playing", game_id: gid} = m when is_integer(gid) ->
        {:noreply, maybe_schedule_match(state, m)}

      %{state: finished} when finished in ~w(game_over timeout finished) ->
        # A game just finished. If the pair gets a rematch, its new game is
        # created `tournament_rematch_timeout_ms` later and is announced only on
        # per-player topics (which we don't subscribe to). Re-scan after that
        # window so the rematch game gets typed/submitted too.
        {:noreply, schedule_rescan(state)}

      _ ->
        {:noreply, state}
    end
  end

  def handle_info(%{event: "tournament:finished"}, state) do
    {:noreply, cancel_all_timers(state)}
  end

  def handle_info({:start_typing, game_id, user_id, lang, duration_ms}, %{status: :running} = state) do
    state = %{state | timers: Map.delete(state.timers, game_id)}

    if bots_active?(state.tournament_id) do
      pid = spawn(fn -> run_typing(state.tournament_id, game_id, user_id, lang, duration_ms) end)
      ref = Process.monitor(pid)
      {:noreply, %{state | typing: Map.put(state.typing, ref, pid)}}
    else
      Logger.info("simulator(#{state.tournament_id}): bots inactive — skip typing game=#{game_id}")
      {:noreply, state}
    end
  end

  def handle_info({:start_typing, _game_id, _uid, _lang, _duration_ms}, state) do
    # paused / idle: drop the timer fire silently
    {:noreply, state}
  end

  def handle_info(:rescan, %{status: :running} = state) do
    {:noreply, scan_and_schedule(%{state | rescan_timer: nil})}
  end

  def handle_info(:rescan, state) do
    {:noreply, %{state | rescan_timer: nil}}
  end

  # A typing task finished (or was killed): drop it from the tracking map.
  def handle_info({:DOWN, ref, :process, _pid, _reason}, state) do
    {:noreply, %{state | typing: Map.delete(state.typing, ref)}}
  end

  def handle_info(_msg, state), do: {:noreply, state}

  # INTERNALS

  defp ensure_tournament_started(state) do
    with %{state: "waiting_participants"} = tournament <- get_tournament(state.tournament_id),
         %User{} = creator <- get_creator(tournament) do
      # Always run the simulation with the full 100_001..100_200 player set:
      # join any that aren't already in the tournament before starting.
      case Setup.top_up_players(state.tournament_id) do
        :ok -> :ok
        other -> Logger.warning("simulator(#{state.tournament_id}): top_up_players returned #{inspect(other)}")
      end

      Tournament.Server.handle_event(state.tournament_id, :start, %{user: creator})
    else
      _ -> :noop
    end

    state
  end

  defp scan_and_schedule(state) do
    case get_tournament(state.tournament_id) do
      %{} = tournament -> schedule_playing_matches(state, tournament)
      _ -> state
    end
  end

  defp schedule_playing_matches(state, tournament) do
    if bots_active?(tournament) do
      tournament
      |> Helpers.get_matches("playing")
      |> Enum.reduce(state, fn match, acc -> maybe_schedule_match(acc, match) end)
    else
      Logger.info("simulator(#{state.tournament_id}): bots inactive — skip scheduling")
      state
    end
  end

  defp maybe_schedule_match(state, %{game_id: nil}), do: state
  defp maybe_schedule_match(state, %{player_ids: []}), do: state

  defp maybe_schedule_match(state, match) do
    if MapSet.member?(state.scheduled_games, match.game_id) do
      state
    else
      do_schedule(state, match)
    end
  end

  defp do_schedule(state, match) do
    {winner_id, pair_winners} =
      ensure_winner(state.tournament_id, state.pair_winners, match.player_ids, state.settings.win_skew)

    duration_ms = pick_delay_ms(state.settings)
    lang = "python"

    timer_ref =
      Process.send_after(self(), {:start_typing, match.game_id, winner_id, lang, duration_ms}, @start_delay_ms)

    Logger.info(
      "simulator(#{state.tournament_id}): scheduled game=#{match.game_id} winner=#{winner_id} " <>
        "type_window=#{duration_ms}ms players=#{inspect(match.player_ids)}"
    )

    %{
      state
      | scheduled_games: MapSet.put(state.scheduled_games, match.game_id),
        pair_winners: pair_winners,
        timers: Map.put(state.timers, match.game_id, timer_ref)
    }
  end

  defp ensure_winner(tournament_id, pair_winners, player_ids, win_skew) do
    key = Enum.sort(player_ids)

    case Map.get(pair_winners, key) do
      nil ->
        winner_id = pick_winner(tournament_id, player_ids, win_skew)
        {winner_id, Map.put(pair_winners, key, winner_id)}

      existing ->
        {existing, pair_winners}
    end
  end

  defp pick_winner(tournament_id, player_ids, win_skew) do
    ratings = ratings_for(player_ids)
    [{p_hi, _r_hi}, {p_lo, _r_lo}] = Enum.sort_by(Enum.zip(player_ids, ratings), fn {_, r} -> -r end)

    # Deterministic-per-pair rand so a pair's winner is consistent across both
    # games of their match (per_round_pair plays the same pair twice).
    pair_seed = :erlang.phash2({tournament_id, Enum.sort(player_ids)})
    <<u32::32, _::binary>> = :crypto.hash(:sha256, <<pair_seed::64>>)
    rand_val = u32 / 0xFFFFFFFF

    if rand_val < win_skew, do: p_hi, else: p_lo
  end

  defp ratings_for(player_ids) do
    import Ecto.Query

    rating_map =
      from(u in User, where: u.id in ^player_ids, select: {u.id, u.rating})
      |> Repo.all()
      |> Map.new()

    Enum.map(player_ids, fn id -> Map.get(rating_map, id, 1200) end)
  end

  defp pick_delay_ms(%{avg_seconds: avg, jitter_pct: jitter}) do
    jitter_frac = max(jitter, 0) / 100.0
    spread = avg * jitter_frac
    delta = (:rand.uniform() - 0.5) * 2.0 * spread
    delay = max(0.5, avg + delta)
    trunc(delay * 1000)
  end

  # Re-scan for newly created (rematch) games shortly after the rematch window.
  # Coalesce: keep a single pending rescan timer so a burst of finishes only
  # triggers one scan.
  defp schedule_rescan(%{rescan_timer: ref} = state) when is_reference(ref), do: state

  defp schedule_rescan(state) do
    rematch_ms = Application.get_env(:codebattle, :tournament_rematch_timeout_ms, 2000)
    ref = Process.send_after(self(), :rescan, rematch_ms + @rescan_buffer_ms)
    %{state | rescan_timer: ref}
  end

  defp cancel_all_timers(state) do
    if is_reference(state.rescan_timer) do
      Process.cancel_timer(state.rescan_timer)
    end

    Enum.each(state.timers, fn {_gid, ref} ->
      try do
        Process.cancel_timer(ref)
      rescue
        _ -> :ok
      end
    end)

    %{kill_typing(state) | timers: %{}, rescan_timer: nil}
  end

  # Kill any in-flight typing tasks so bots that are mid-typing stop immediately
  # (and never reach their submit). Demonitor with :flush so the resulting :DOWN
  # is dropped rather than left in the mailbox.
  defp kill_typing(state) do
    Enum.each(state.typing, fn {ref, pid} ->
      Process.demonitor(ref, [:flush])
      Process.exit(pid, :kill)
    end)

    %{state | typing: %{}}
  end

  # Type the solution into the editor line by line over `duration_ms`, then
  # submit the full correct solution for checking at the end of the window.
  defp run_typing(tournament_id, game_id, user_id, lang, duration_ms) do
    with {:ok, %{task: task} = _game} <- Game.Context.fetch_game(game_id),
         text when is_binary(text) and text != "" <- pick_solution_text(task),
         %User{} = user <- User.get(user_id) do
      lines = String.split(text, "\n")
      steps = length(lines)
      # `steps + 1` slots: one per typed line, plus a final pause before submit.
      interval_ms = max(div(duration_ms, steps + 1), @min_type_interval_ms)

      Logger.info(
        "simulator(#{tournament_id}): typing game=#{game_id} player=#{user.name}(##{user_id}) " <>
          "task=#{task.id} lang=#{lang} lines=#{steps} interval=#{interval_ms}ms"
      )

      # Reveal the solution one line at a time. Each step broadcasts the partial
      # editor text to spectators just like a real player typing.
      Enum.each(1..steps, fn line_no ->
        Process.sleep(interval_ms)
        partial = lines |> Enum.take(line_no) |> Enum.join("\n")
        type_editor(game_id, user, partial, lang)
      end)

      # Final beat, then submit the complete, correct solution for checking.
      Process.sleep(interval_ms)
      submit_check(tournament_id, game_id, user, text, lang)
    else
      nil ->
        Logger.warning("simulator(#{tournament_id}): no solution found for game=#{game_id}")

      other ->
        Logger.warning("simulator(#{tournament_id}): typing failed game=#{game_id} #{inspect(other)}")
    end
  end

  # Push a partial editor text: update the server-side game state and broadcast
  # to spectators on the game channel, mirroring `GameChannel`'s "editor:data".
  defp type_editor(game_id, user, editor_text, lang) do
    case Game.Context.update_editor_data(game_id, user, editor_text, lang) do
      {:ok, _game} ->
        CodebattleWeb.Endpoint.broadcast("game:#{game_id}", "editor:data", %{
          user_id: user.id,
          lang_slug: lang,
          editor_text: editor_text
        })

        :ok

      _ ->
        :ok
    end
  end

  defp submit_check(tournament_id, game_id, user, text, lang) do
    if bots_active?(tournament_id) do
      do_submit_check(tournament_id, game_id, user, text, lang)
    else
      Logger.info(
        "simulator(#{tournament_id}): bots inactive — skip submit game=#{game_id} player=#{user.name}(##{user.id})"
      )
    end
  end

  defp do_submit_check(tournament_id, game_id, user, text, lang) do
    Logger.info(
      "simulator(#{tournament_id}): submitting game=#{game_id} player=#{user.name}(##{user.id}) " <>
        "lang=#{lang} chars=#{String.length(text)}"
    )

    try do
      case Game.Context.check_result(game_id, %{
             user: user,
             editor_text: text,
             editor_lang: lang
           }) do
        {:ok, _game, %{solution_status: solution_status}} ->
          Logger.info(
            "simulator(#{tournament_id}): submitted game=#{game_id} player=#{user.name}(##{user.id}) " <>
              "solution_status=#{solution_status}"
          )

          :ok

        {:error, reason} ->
          Logger.warning(
            "simulator(#{tournament_id}): check_result error game=#{game_id} user=#{user.id} reason=#{inspect(reason)}"
          )
      end
    rescue
      e ->
        Logger.warning(
          "simulator(#{tournament_id}): check_result raised game=#{game_id} user=#{user.id} #{Exception.message(e)}"
        )
    end
  end

  # Prefer `task.solution` (canonical); fall back to `task.solutions["python"]`.
  defp pick_solution_text(%{solution: text}) when is_binary(text) and byte_size(text) > 0, do: text

  defp pick_solution_text(%{solutions: solutions}) when is_map(solutions) do
    Enum.find_value(["python", "py"], fn key ->
      case Map.get(solutions, key) do
        text when is_binary(text) and byte_size(text) > 0 -> text
        _ -> nil
      end
    end)
  end

  defp pick_solution_text(_), do: nil

  defp get_tournament(tournament_id) do
    case Tournament.Context.get(tournament_id) do
      nil -> nil
      t -> t
    end
  end

  defp get_creator(tournament) do
    cond do
      match?(%User{}, tournament.creator) -> tournament.creator
      is_integer(tournament.creator_id) -> User.get(tournament.creator_id)
      true -> nil
    end
  end

  defp merge_settings(current, attrs) do
    %{
      avg_seconds: parse_float(attrs["avg_seconds"] || attrs[:avg_seconds], current.avg_seconds, 0.5, 600.0),
      jitter_pct: parse_float(attrs["jitter_pct"] || attrs[:jitter_pct], current.jitter_pct, 0.0, 100.0),
      win_skew: parse_float(attrs["win_skew"] || attrs[:win_skew], current.win_skew, 0.5, 1.0),
      submit_loser_broken:
        parse_bool(attrs["submit_loser_broken"] || attrs[:submit_loser_broken], current.submit_loser_broken)
    }
  end

  defp parse_float(nil, default, _, _), do: default
  defp parse_float(v, _default, min, max) when is_number(v), do: clamp(v / 1.0, min, max)

  defp parse_float(v, default, min, max) when is_binary(v) do
    case Float.parse(v) do
      {f, _} -> clamp(f, min, max)
      :error -> default
    end
  end

  defp parse_float(_, default, _, _), do: default

  defp clamp(x, min, _max) when x < min, do: min
  defp clamp(x, _min, max) when x > max, do: max
  defp clamp(x, _, _), do: x

  defp parse_bool(nil, default), do: default
  defp parse_bool(true, _), do: true
  defp parse_bool(false, _), do: false
  defp parse_bool("true", _), do: true
  defp parse_bool("on", _), do: true
  defp parse_bool("1", _), do: true
  defp parse_bool(_, default), do: default

  defp call(tournament_id, msg) do
    with {:ok, _pid} <- ensure_started(tournament_id) do
      GenServer.call(via(tournament_id), msg, 10_000)
    end
  catch
    :exit, reason -> {:error, reason}
  end

  defp via(tournament_id), do: {:via, Registry, {Codebattle.Registry, registry_key(tournament_id)}}
  defp registry_key(tournament_id), do: "tournament_simulator::#{tournament_id}"

  # Bots act only when BOTH gates are open:
  #   * the global `:enable_simulator_bots` flag is on (OFF by default), and
  #   * this tournament is still opted in via `meta.simulator == true`.
  # Either one being off makes the simulator inert (no scheduling, typing, or
  # submitting) without finishing or otherwise touching the tournament.
  defp bots_active?(%{} = tournament), do: bots_enabled?() and meta_simulator?(tournament)

  defp bots_active?(tournament_id) when is_integer(tournament_id) do
    case get_tournament(tournament_id) do
      %{} = tournament -> bots_active?(tournament)
      _ -> false
    end
  end

  defp bots_enabled?, do: bots_globally_enabled?()

  defp meta_simulator?(%{meta: meta}) when is_map(meta), do: meta["simulator"] == true or meta[:simulator] == true
  defp meta_simulator?(_), do: false

  # Persist `meta.simulator = true` on the tournament if it isn't already set,
  # so a tournament created without it can still be driven by bots.
  defp ensure_simulator_meta(state) do
    case get_tournament(state.tournament_id) do
      %{meta: meta} = tournament ->
        if !meta_simulator?(tournament) do
          new_meta = Map.put(meta || %{}, :simulator, true)
          Tournament.Server.update_tournament(%{tournament | meta: new_meta})
        end

      _ ->
        :noop
    end

    state
  end
end
