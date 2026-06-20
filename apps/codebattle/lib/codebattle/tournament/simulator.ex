defmodule Codebattle.Tournament.Simulator do
  @moduledoc """
  Tournament simulation driver for Top200 strategy.

  One simulator process per tournament. The process:
    * listens to the per-tournament PubSub topic for new matches
    * for each live match it picks a winner (rating-weighted) and schedules
      a Python solution submission at a randomized delay
    * exposes start/pause/resume/retry/stop/update_settings API for the
      admin stream LiveView controls

  Submitted solutions are read from `Codebattle.Task.solutions["python"]`.
  Matches whose tasks have no python solution are logged and skipped.
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
      timers: %{}
    }

    {:ok, state}
  end

  @impl true
  def handle_call(:start, _from, state) do
    Logger.info("simulator(#{state.tournament_id}): start (settings=#{inspect(state.settings)})")
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

      _ ->
        {:noreply, state}
    end
  end

  def handle_info(%{event: "tournament:finished"}, state) do
    {:noreply, cancel_all_timers(state)}
  end

  def handle_info({:submit, game_id, user_id, lang}, %{status: :running} = state) do
    Task.start(fn -> submit_solution(state.tournament_id, game_id, user_id, lang) end)
    {:noreply, %{state | timers: Map.delete(state.timers, game_id)}}
  end

  def handle_info({:submit, _game_id, _uid, _lang}, state) do
    # paused / idle: drop the timer fire silently
    {:noreply, state}
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
      %{} = tournament ->
        tournament
        |> Helpers.get_matches("playing")
        |> Enum.reduce(state, fn match, acc -> maybe_schedule_match(acc, match) end)

      _ ->
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

    delay_ms = pick_delay_ms(state.settings)
    lang = "python"
    timer_ref = Process.send_after(self(), {:submit, match.game_id, winner_id, lang}, delay_ms)

    Logger.info(
      "simulator(#{state.tournament_id}): scheduled game=#{match.game_id} winner=#{winner_id} " <>
        "delay=#{delay_ms}ms players=#{inspect(match.player_ids)}"
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

  defp cancel_all_timers(state) do
    Enum.each(state.timers, fn {_gid, ref} ->
      try do
        Process.cancel_timer(ref)
      rescue
        _ -> :ok
      end
    end)

    %{state | timers: %{}}
  end

  defp submit_solution(tournament_id, game_id, user_id, lang) do
    with {:ok, %{task: task} = _game} <- Game.Context.fetch_game(game_id),
         text when is_binary(text) and text != "" <- pick_solution_text(task),
         %User{} = user <- User.get(user_id) do
      Logger.info(
        "simulator(#{tournament_id}): submitting game=#{game_id} player=#{user.name}(##{user_id}) " <>
          "task=#{task.id} lang=#{lang} chars=#{String.length(text)}"
      )

      try do
        case Game.Context.check_result(game_id, %{
               user: user,
               editor_text: text,
               editor_lang: lang
             }) do
          {:ok, _game, %{solution_status: solution_status}} ->
            Logger.info(
              "simulator(#{tournament_id}): submitted game=#{game_id} player=#{user.name}(##{user_id}) " <>
                "solution_status=#{solution_status}"
            )

            :ok

          {:error, reason} ->
            Logger.warning(
              "simulator(#{tournament_id}): check_result error game=#{game_id} user=#{user_id} reason=#{inspect(reason)}"
            )
        end
      rescue
        e ->
          Logger.warning(
            "simulator(#{tournament_id}): check_result raised game=#{game_id} user=#{user_id} #{Exception.message(e)}"
          )
      end
    else
      nil ->
        Logger.warning("simulator(#{tournament_id}): no solution found for game=#{game_id}")

      other ->
        Logger.warning("simulator(#{tournament_id}): submit failed game=#{game_id} #{inspect(other)}")
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
end
