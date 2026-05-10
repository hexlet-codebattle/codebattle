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
    {:ok, schedule_start(state, group_tournament)}
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
    updated =
      group_tournament
      |> GroupTournament.changeset(%{
        state: "active",
        started_at: DateTime.utc_now(:second),
        current_round_position: 1,
        last_round_started_at: NaiveDateTime.utc_now(:second),
        last_round_ended_at: nil
      })
      |> Repo.update!()
      |> Repo.preload([:creator, :group_task, players: [:user]])
      |> Map.put(:is_live, true)

    case SliceRunner.assign_slices(updated) do
      {:ok, count} ->
        Logger.info("group_tournament=#{updated.id} assigned #{count} slices on start")

      {:error, reason} ->
        Logger.warning("group_tournament=#{updated.id} slice assignment failed: #{inspect(reason)}")
    end

    broadcast_status_update(updated)

    next_state =
      state
      |> Map.put(:group_tournament, updated)
      |> Map.put(:start_timer_ref, nil)
      |> schedule_round_finish(updated)

    {:noreply, next_state}
  end

  def handle_info(:finish_round, %{group_tournament: %{state: "active"} = group_tournament} = state) do
    slice_results = SliceRunner.run_all_slices(group_tournament)

    ok = Enum.count(slice_results, fn {_idx, r} -> r == :ok end)
    skipped = Enum.count(slice_results, fn {_idx, r} -> r == :skipped end)
    errored = Enum.count(slice_results, fn {_idx, r} -> match?({:error, _}, r) end)
    Logger.info("group_tournament=#{group_tournament.id} slice runs ok=#{ok} skipped=#{skipped} error=#{errored}")

    finished_round_at = NaiveDateTime.utc_now(:second)

    attrs = %{
      last_round_ended_at: finished_round_at,
      meta:
        Map.merge(group_tournament.meta || %{}, %{
          "last_slice_runs_total" => length(slice_results),
          "last_slice_runs_ok" => ok,
          "last_slice_runs_skipped" => skipped,
          "last_slice_runs_error" => errored
        })
    }

    attrs =
      if group_tournament.current_round_position >= group_tournament.rounds_count do
        Map.merge(attrs, %{
          state: "finished",
          finished_at: DateTime.utc_now(:second)
        })
      else
        Map.merge(attrs, %{
          current_round_position: group_tournament.current_round_position + 1,
          last_round_started_at: finished_round_at
        })
      end

    updated =
      group_tournament
      |> GroupTournament.changeset(attrs)
      |> Repo.update!()
      |> Repo.preload([:creator, :group_task, players: [:user]])
      |> Map.put(:is_live, true)

    if updated.state != group_tournament.state do
      broadcast_status_update(updated)

      if updated.state == "finished" do
        Codebattle.UserEvent.Stage.Context.save_group_tournament_results_async(updated.id)
        enqueue_finalize_jobs(updated)
      end
    end

    next_state =
      state
      |> Map.put(:group_tournament, updated)
      |> Map.put(:finish_timer_ref, nil)

    next_state =
      if updated.state == "active" do
        schedule_round_finish(next_state, updated)
      else
        next_state
      end

    {:noreply, next_state}
  end

  def handle_info(_message, state) do
    {:noreply, state}
  end

  # Per-submission "preview" run: only the submitting player's solution is
  # executed, and the run is left untagged (slice_index nil). Slice runs fire
  # on the round timer and carry the slice_index — those are the scored runs.
  defp maybe_run_after_solution_submission(
         %{group_tournament: %{state: "active"} = group_tournament} = state,
         submitted_solution
       )
       when not is_nil(submitted_solution) do
    GroupTaskContext.run_group_task(group_tournament.group_task, [submitted_solution.user_id], %{
      group_tournament_id: group_tournament.id,
      include_bots: group_tournament.include_bots
    })

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

  defp schedule_round_finish(state, group_tournament) do
    timeout_seconds =
      group_tournament.round_timeout_seconds || group_tournament.group_task.time_to_solve_sec || 300

    %{state | finish_timer_ref: Process.send_after(self(), :finish_round, to_timeout(second: timeout_seconds))}
  end

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

  defp server_name(id), do: {:via, Registry, {Codebattle.Registry, "group_tournament_srv:#{id}"}}
end
