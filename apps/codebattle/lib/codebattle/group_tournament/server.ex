defmodule Codebattle.GroupTournament.Server do
  @moduledoc false
  use GenServer

  alias Codebattle.ExternalPlatformInvite.Context, as: InviteContext
  alias Codebattle.GroupTask.Context, as: GroupTaskContext
  alias Codebattle.GroupTournament
  alias Codebattle.GroupTournament.Context
  alias Codebattle.GroupTournament.SliceRunner
  alias Codebattle.PubSub
  alias Codebattle.Repo
  alias Codebattle.UserGroupTournament.Context, as: UserGroupTournamentContext

  require Logger

  def start_link(group_tournament_id) do
    GenServer.start_link(__MODULE__, group_tournament_id, name: server_name(group_tournament_id))
  end

  def get_group_tournament(id) do
    GenServer.call(server_name(id), :get_group_tournament)
  catch
    :exit, _ -> nil
  end

  def update_group_tournament(%GroupTournament{id: id} = group_tournament) do
    GenServer.call(server_name(id), {:update, group_tournament})
  catch
    :exit, _ -> {:error, :not_found}
  end

  def join(id, user, lang) do
    GenServer.call(server_name(id), {:join, user, lang}, 30_000)
  catch
    :exit, _ -> {:error, :not_found}
  end

  def start_tournament(id, user) do
    GenServer.call(server_name(id), {:start_tournament, user}, 30_000)
  catch
    :exit, _ -> {:error, :not_found}
  end

  def submit_solution(id, user, solution) do
    GenServer.call(server_name(id), {:submit_solution, user, solution}, 30_000)
  catch
    :exit, _ -> {:error, :not_found}
  end

  def start_now(id) do
    GenServer.call(server_name(id), :start_now, 30_000)
  catch
    :exit, _ -> {:error, :not_found}
  end

  def finish_tournament(id) do
    GenServer.call(server_name(id), :finish_tournament, 30_000)
  catch
    :exit, _ -> {:error, :not_found}
  end

  def cancel_tournament(id) do
    GenServer.call(server_name(id), :cancel_tournament, 30_000)
  catch
    :exit, _ -> {:error, :not_found}
  end

  @impl true
  def init(group_tournament_id) do
    group_tournament = group_tournament_id |> Context.get_group_tournament!() |> Map.put(:is_live, true)
    state = %{group_tournament: group_tournament, start_timer_ref: nil, finish_timer_ref: nil}

    state =
      state
      |> schedule_start(group_tournament)
      |> maybe_resume_round_finish(group_tournament)

    {:ok, state}
  end

  @impl true
  def handle_call(:get_group_tournament, _from, state) do
    {:reply, state.group_tournament, state}
  end

  def handle_call(:start_now, _from, %{group_tournament: %{state: "waiting_participants"} = group_tournament} = state) do
    updated =
      group_tournament
      |> GroupTournament.changeset(%{starts_at: DateTime.utc_now()})
      |> Repo.update!()
      |> Repo.preload([:creator, :group_task, players: [:user]])
      |> Map.put(:is_live, true)

    send(self(), :start_tournament)

    {:reply, {:ok, updated}, %{cancel_start_timer(state) | group_tournament: updated}}
  end

  def handle_call(:start_now, _from, state) do
    {:reply, {:error, :invalid_state}, state}
  end

  def handle_call(
        {:start_tournament, user},
        _from,
        %{group_tournament: %{state: "waiting_participants", require_invitation: true} = group_tournament} = state
      ) do
    invite = InviteContext.get_invite(user.id, group_tournament.id)

    if invite && invite.state == "accepted" do
      updated =
        group_tournament
        |> GroupTournament.changeset(%{starts_at: DateTime.utc_now()})
        |> Repo.update!()
        |> Repo.preload([:creator, :group_task, players: [:user]])
        |> Map.put(:is_live, true)

      send(self(), :start_tournament)

      {:reply, {:ok, updated}, %{cancel_start_timer(state) | group_tournament: updated}}
    else
      {:reply, {:error, :invitation_not_accepted}, state}
    end
  end

  def handle_call({:start_tournament, _user}, _from, %{group_tournament: %{require_invitation: false}} = state) do
    {:reply, {:error, :invitation_not_required}, state}
  end

  def handle_call({:start_tournament, _user}, _from, state) do
    {:reply, {:error, :invalid_state}, state}
  end

  def handle_call(:finish_tournament, _from, %{group_tournament: %{state: "active"} = group_tournament} = state) do
    updated =
      group_tournament
      |> GroupTournament.changeset(%{
        state: "finished",
        finished_at: DateTime.utc_now(:second),
        last_round_ended_at: NaiveDateTime.utc_now(:second)
      })
      |> Repo.update!()
      |> Repo.preload([:creator, :group_task, players: [:user]])
      |> Map.put(:is_live, true)

    Codebattle.UserEvent.Stage.Context.save_group_tournament_results_async(updated.id)
    enqueue_finalize_jobs(updated)

    next_state =
      state
      |> cancel_finish_timer()
      |> Map.put(:group_tournament, updated)

    {:reply, {:ok, updated}, next_state}
  end

  def handle_call(:finish_tournament, _from, state) do
    {:reply, {:error, :invalid_state}, state}
  end

  def handle_call(:cancel_tournament, _from, %{group_tournament: group_tournament} = state) do
    updated =
      group_tournament
      |> GroupTournament.changeset(%{
        state: "canceled",
        finished_at: DateTime.utc_now(:second)
      })
      |> Repo.update!()
      |> Repo.preload([:creator, :group_task, players: [:user]])
      |> Map.put(:is_live, true)

    next_state =
      state
      |> cancel_start_timer()
      |> cancel_finish_timer()
      |> Map.put(:group_tournament, updated)

    {:reply, {:ok, updated}, next_state}
  end

  def handle_call({:update, group_tournament}, _from, state) do
    next_state =
      state
      |> cancel_start_timer()
      |> cancel_finish_timer()
      |> Map.put(:group_tournament, Map.put(group_tournament, :is_live, true))
      |> schedule_start(group_tournament)

    {:reply, :ok, next_state}
  end

  def handle_call({:join, user, lang}, _from, %{group_tournament: group_tournament} = state) do
    Logger.info("Group tournament setup group_tournament_id=#{group_tournament.id} user_id=#{user.id} lang=#{lang}")

    UserGroupTournamentContext.get_or_create(user, group_tournament)

    result =
      Context.create_or_update_player(group_tournament, user.id, %{
        lang: lang,
        state: "active",
        last_setup_at: DateTime.utc_now(:second)
      })

    case result do
      {:ok, _player} ->
        updated = group_tournament.id |> Context.get_group_tournament!() |> Map.put(:is_live, true)
        {:reply, {:ok, updated}, %{state | group_tournament: updated}}

      {:error, _} = error ->
        {:reply, error, state}
    end
  end

  def handle_call({:submit_solution, user, solution}, _from, %{group_tournament: group_tournament} = state) do
    current_player = Enum.find(group_tournament.players, &(&1.user_id == user.id))

    if is_nil(current_player) do
      {:reply, {:error, :join_tournament_first}, state}
    else
      case GroupTaskContext.create_solution(group_tournament.group_task_id, user.id, %{
             group_tournament_id: group_tournament.id,
             lang: current_player.lang,
             solution: solution
           }) do
        {:ok, submitted_solution} ->
          next_state = maybe_run_after_solution_submission(state, submitted_solution)
          {:reply, {:ok, submitted_solution}, next_state}

        {:error, _} = error ->
          {:reply, error, state}
      end
    end
  end

  @impl true
  def handle_info(:start_tournament, %{group_tournament: %{state: "waiting_participants"} = group_tournament} = state) do
    starting_round = starting_round_position(group_tournament)
    slice_count = compute_slice_count(group_tournament)

    updated =
      group_tournament
      |> GroupTournament.changeset(%{
        state: "active",
        started_at: DateTime.utc_now(:second),
        current_round_position: starting_round,
        slice_count: slice_count,
        last_round_started_at: NaiveDateTime.utc_now(:second),
        last_round_ended_at: nil
      })
      |> Repo.update!()
      |> Repo.preload([:creator, :group_task, players: [:user]])
      |> Map.put(:is_live, true)

    perform_round_start(updated)

    enqueue_occupy_jobs(updated)

    broadcast_status_update(updated)

    next_state =
      state
      |> Map.put(:group_tournament, updated)
      |> Map.put(:start_timer_ref, nil)
      |> schedule_round_finish(updated)

    {:noreply, next_state}
  end

  def handle_info(:finish_round, %{group_tournament: %{state: "active"} = group_tournament} = state) do
    {slice_results, round_results} = run_round(group_tournament)

    log_slice_results(group_tournament, slice_results)

    finished_round_at = NaiveDateTime.utc_now(:second)

    attrs = base_finish_attrs(group_tournament, finished_round_at, slice_results)

    break_seconds = max(group_tournament.break_duration_seconds || 0, 0)

    attrs =
      if group_tournament.current_round_position >= group_tournament.rounds_count do
        Map.merge(attrs, %{
          state: "finished",
          finished_at: DateTime.utc_now(:second)
        })
      else
        # During the break, last_round_started_at is set to a future timestamp
        # (finished_round_at + break_seconds). The frontend treats a future
        # last_round_started_at as "intermission until next round".
        Map.merge(attrs, %{
          current_round_position: group_tournament.current_round_position + 1,
          last_round_started_at: NaiveDateTime.add(finished_round_at, break_seconds, :second)
        })
      end

    updated =
      group_tournament
      |> GroupTournament.changeset(attrs)
      |> Repo.update!()
      |> Repo.preload([:creator, :group_task, players: [:user]])
      |> Map.put(:is_live, true)

    apply_post_round_transitions(group_tournament, updated, round_results)

    broadcast_status_update(updated)

    if updated.state != group_tournament.state and updated.state == "finished" do
      Codebattle.UserEvent.Stage.Context.save_group_tournament_results_async(updated.id)
      enqueue_finalize_jobs(updated)
    end

    next_state =
      state
      |> Map.put(:group_tournament, updated)
      |> Map.put(:finish_timer_ref, nil)

    next_state =
      if updated.state == "active" do
        schedule_round_finish(next_state, updated, break_seconds)
      else
        next_state
      end

    {:noreply, next_state}
  end

  def handle_info(_message, state) do
    {:noreply, state}
  end

  # --- Round orchestration helpers ---

  # All tournament types start at round 1. For ranked tournaments, round 1
  # is the seeding round; rounds 2..rounds_count are the slice rounds.
  defp starting_round_position(_), do: 1

  defp compute_slice_count(%GroupTournament{type: "ranked"} = t) do
    active = count_active_players(t.id)

    if active <= 0 do
      0
    else
      div(active - 1, t.slice_size) + 1
    end
  end

  defp compute_slice_count(_), do: nil

  defp count_active_players(group_tournament_id) do
    import Ecto.Query

    Codebattle.GroupTournamentPlayer
    |> where([p], p.group_tournament_id == ^group_tournament_id and p.state == "active")
    |> select([p], count(p.id))
    |> Repo.one()
    |> Kernel.||(0)
  end

  # For ranked tournaments, round 1 is a submission window: players submit
  # solutions during the round (each submission runs as a bot-less debug run),
  # then at round-end we run seeding against their latest submissions with
  # bots and slice them. For individual tournaments, assign_slices is called
  # once at start (legacy behaviour) so existing slice-aware features still
  # work even though no movement happens later.
  defp perform_round_start(%GroupTournament{type: "ranked", current_round_position: 1}) do
    :ok
  end

  defp perform_round_start(%GroupTournament{} = t) do
    case SliceRunner.assign_slices(t) do
      {:ok, count} ->
        Logger.info("group_tournament=#{t.id} assigned #{count} slices on start")

      {:error, reason} ->
        Logger.warning("group_tournament=#{t.id} slice assignment failed: #{inspect(reason)}")
    end
  end

  # `run_round` returns the slice-runner results AND the round_results array
  # used by movement. Returns `[]` for the seeding round (round 1 ranked).
  defp run_round(%GroupTournament{type: "ranked", current_round_position: 1} = t) do
    # Seeding round end: run each player's latest submission with bots
    # (parallel pool inside SliceRunner) to produce seed scores. No
    # round_results are returned — slicing happens in apply_post_round_transitions.
    SliceRunner.run_seeding(t)
    {[], []}
  end

  defp run_round(%GroupTournament{type: "ranked"} = t) do
    slice_results = SliceRunner.run_all_slices(t)

    round_results =
      Enum.flat_map(slice_results, fn
        {_idx, :ok, results} -> results
        _ -> []
      end)

    {slice_results, round_results}
  end

  defp run_round(%GroupTournament{} = t) do
    slice_results = SliceRunner.run_all_slices(t)
    {slice_results, []}
  end

  defp log_slice_results(%GroupTournament{} = t, slice_results) do
    ok = Enum.count(slice_results, fn {_idx, status, _} -> status == :ok end)
    skipped = Enum.count(slice_results, fn {_idx, status, _} -> status == :skipped end)
    errored = Enum.count(slice_results, fn {_idx, status, _} -> match?({:error, _}, status) end)

    Logger.info("group_tournament=#{t.id} slice runs ok=#{ok} skipped=#{skipped} error=#{errored}")
  end

  defp base_finish_attrs(%GroupTournament{} = t, finished_round_at, slice_results) do
    ok = Enum.count(slice_results, fn {_idx, status, _} -> status == :ok end)
    skipped = Enum.count(slice_results, fn {_idx, status, _} -> status == :skipped end)
    errored = Enum.count(slice_results, fn {_idx, status, _} -> match?({:error, _}, status) end)

    %{
      last_round_ended_at: finished_round_at,
      meta:
        Map.merge(t.meta || %{}, %{
          "last_slice_runs_total" => length(slice_results),
          "last_slice_runs_ok" => ok,
          "last_slice_runs_skipped" => skipped,
          "last_slice_runs_error" => errored
        })
    }
  end

  # Post-round transitions for ranked tournaments:
  # - After seeding round (round 1 just ended): assign initial slices by
  #   seed_score, then advance to round 2.
  # - After a slice round: apply movement, then auto-leave players hitting the
  #   inactive threshold.
  defp apply_post_round_transitions(
         %GroupTournament{type: "ranked", current_round_position: 1} = before_t,
         %GroupTournament{} = _updated,
         _round_results
       ) do
    # Use rating strategy for the initial assignment so it sorts by
    # slice_ranking (which SliceRunner.run_seeding/1 wrote based on seed score).
    seeded = %{before_t | slice_strategy: "rating"}

    case SliceRunner.assign_slices(seeded) do
      {:ok, count} ->
        Logger.info("group_tournament=#{before_t.id} assigned #{count} slices after seeding")

      {:error, reason} ->
        Logger.warning("group_tournament=#{before_t.id} initial slice assignment failed: #{inspect(reason)}")
    end
  end

  defp apply_post_round_transitions(
         %GroupTournament{type: "ranked"} = before_t,
         %GroupTournament{} = _updated,
         round_results
       )
       when round_results != [] do
    case SliceRunner.apply_movement(before_t, round_results) do
      {:ok, _} ->
        :ok

      {:error, reason} ->
        Logger.warning("group_tournament=#{before_t.id} movement failed: #{inspect(reason)}")
    end

    maybe_auto_leave_inactive(before_t)
  end

  defp apply_post_round_transitions(_before, _updated, _results), do: :ok

  defp maybe_auto_leave_inactive(%GroupTournament{inactive_rounds_to_leave: threshold} = t)
       when is_integer(threshold) and threshold > 0 do
    import Ecto.Query

    {count, _} =
      Codebattle.GroupTournamentPlayer
      |> where(
        [p],
        p.group_tournament_id == ^t.id and p.state == "active" and
          p.consecutive_zero_rounds >= ^threshold
      )
      |> Repo.update_all(set: [state: "left", updated_at: NaiveDateTime.utc_now()])

    if count > 0 do
      Logger.info("group_tournament=#{t.id} auto-left #{count} inactive players")
    end
  end

  defp maybe_auto_leave_inactive(_), do: :ok

  # Per-submission debug run: only the submitting player's solution is executed
  # — never with bots — so the user can see their own output. The run is left
  # untagged (slice_index nil). Scored runs fire on the round timer and carry
  # the slice_index.
  defp maybe_run_after_solution_submission(
         %{group_tournament: %{state: "active"} = group_tournament} = state,
         submitted_solution
       )
       when not is_nil(submitted_solution) do
    run_result =
      GroupTaskContext.run_group_task(group_tournament.group_task, [submitted_solution.user_id], %{
        group_tournament_id: group_tournament.id,
        include_bots: false
      })

    Context.broadcast_run_update(group_tournament, run_result, submitted_solution)

    state
  end

  defp maybe_run_after_solution_submission(state, _submitted_solution), do: state

  defp schedule_start(state, %{state: "waiting_participants", require_invitation: true}) do
    # When require_invitation is set, don't auto-start on timer.
    # Tournament starts via start_tournament (user-initiated) or start_now (manual by admin).
    state
  end

  defp schedule_start(state, %{state: "waiting_participants", starts_at: starts_at}) do
    timeout_ms = max(DateTime.diff(starts_at, DateTime.utc_now(), :millisecond), 0)
    %{state | start_timer_ref: Process.send_after(self(), :start_tournament, timeout_ms)}
  end

  defp schedule_start(state, _group_tournament), do: state

  defp schedule_round_finish(state, group_tournament, break_seconds \\ 0) do
    timeout_seconds =
      group_tournament.round_timeout_seconds || group_tournament.group_task.time_to_solve_sec || 300

    total = timeout_seconds + max(break_seconds, 0)

    %{state | finish_timer_ref: Process.send_after(self(), :finish_round, to_timeout(second: total))}
  end

  # On process restart, an active tournament has no finish timer scheduled by
  # init/1. If a round was in progress (last_round_started_at set, no end),
  # compute the remaining seconds and (re)schedule :finish_round. If the round
  # window has already elapsed, fire immediately so the round can advance.
  defp maybe_resume_round_finish(state, %GroupTournament{state: "active", last_round_started_at: started_at} = t)
       when not is_nil(started_at) do
    timeout_seconds = t.round_timeout_seconds || (t.group_task && t.group_task.time_to_solve_sec) || 300
    elapsed = NaiveDateTime.diff(NaiveDateTime.utc_now(:second), started_at, :second)
    remaining_ms = max((timeout_seconds - elapsed) * 1000, 0)

    Logger.info("group_tournament=#{t.id} resuming finish timer, remaining_ms=#{remaining_ms}")
    %{state | finish_timer_ref: Process.send_after(self(), :finish_round, remaining_ms)}
  end

  defp maybe_resume_round_finish(state, _group_tournament), do: state

  defp cancel_start_timer(%{start_timer_ref: ref} = state) when is_reference(ref) do
    _ = Process.cancel_timer(ref, async: false, info: false)
    %{state | start_timer_ref: nil}
  end

  defp cancel_start_timer(state), do: state

  defp cancel_finish_timer(%{finish_timer_ref: ref} = state) when is_reference(ref) do
    _ = Process.cancel_timer(ref, async: false, info: false)
    %{state | finish_timer_ref: nil}
  end

  defp cancel_finish_timer(state), do: state

  defp broadcast_status_update(%GroupTournament{} = group_tournament) do
    player_user_ids = Enum.map(group_tournament.players, & &1.user_id)

    PubSub.broadcast("group_tournament:status_updated", %{
      group_tournament_id: group_tournament.id,
      status: group_tournament.state,
      user_ids: player_user_ids
    })
  end

  @finalize_chunk_size 50

  defp enqueue_finalize_jobs(%GroupTournament{run_on_external_platform: false}), do: :ok

  defp enqueue_finalize_jobs(%GroupTournament{} = group_tournament) do
    group_tournament.players
    |> Enum.map(& &1.user_id)
    |> Enum.chunk_every(@finalize_chunk_size)
    |> Enum.with_index()
    |> Enum.each(fn {user_ids, chunk_index} ->
      %{group_tournament_id: group_tournament.id, user_ids: user_ids, chunk: chunk_index}
      |> Codebattle.Workers.GroupTournamentFinalizeWorker.new()
      |> Oban.insert()
    end)
  end

  defp enqueue_occupy_jobs(%GroupTournament{run_on_external_platform: false}), do: :ok

  defp enqueue_occupy_jobs(%GroupTournament{} = group_tournament) do
    group_tournament.players
    |> Enum.map(& &1.user_id)
    |> Enum.chunk_every(@finalize_chunk_size)
    |> Enum.with_index()
    |> Enum.each(fn {user_ids, chunk_index} ->
      %{group_tournament_id: group_tournament.id, user_ids: user_ids, chunk: chunk_index}
      |> Codebattle.Workers.GroupTournamentOccupyWorker.new()
      |> Oban.insert()
    end)
  end

  defp server_name(id), do: {:via, Registry, {Codebattle.Registry, "group_tournament_srv:#{id}"}}
end
