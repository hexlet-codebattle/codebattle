defmodule Codebattle.Game.TimeoutServer do
  @moduledoc false

  use GenServer

  alias Codebattle.Game

  require Logger

  @retry_timeout_ms 1_000

  # API
  def start_timer(game_id, timeout_seconds) do
    :ok = GenServer.cast(server_name(game_id), {:start, timeout_seconds})
  end

  def terminate_after(game_id, timeout_minutes) do
    :ok = GenServer.cast(server_name(game_id), {:terminate, timeout_minutes})
  end

  def get_snapshot(game_id) do
    GenServer.call(server_name(game_id), :get_snapshot)
  catch
    :exit, _reason -> nil
  end

  def import_snapshot(game_id, snapshot) when is_map(snapshot) do
    :ok = GenServer.call(server_name(game_id), {:import_snapshot, snapshot})
  catch
    :exit, _reason -> :ok
  end

  def start_link(game_id) do
    GenServer.start_link(__MODULE__, game_id, name: server_name(game_id))
  end

  # SERVER

  def init(game_id) do
    Logger.debug("Start timeout server for game_id: #{game_id}")

    {:ok,
     %{
       game_id: game_id,
       timeout_ref: nil,
       terminate_ref: nil,
       timeout_due_at_ms: nil,
       terminate_due_at_ms: nil
     }}
  end

  def handle_cast({:start, timeout_seconds}, state) do
    if timeout_seconds >= 0 do
      timeout_ms = to_timeout(second: timeout_seconds)
      ref = Process.send_after(self(), :trigger_timeout, timeout_ms)

      {:noreply,
       %{
         state
         | timeout_ref: ref,
           timeout_due_at_ms: monotonic_now_ms() + timeout_ms
       }}
    else
      {:noreply, state}
    end
  end

  def handle_cast({:terminate, timeout_minutes}, state) do
    timeout_ms = to_timeout(minute: timeout_minutes)
    ref = Process.send_after(self(), :trigger_terminate, timeout_ms)

    {:noreply,
     %{
       state
       | terminate_ref: ref,
         terminate_due_at_ms: monotonic_now_ms() + timeout_ms
     }}
  end

  def handle_call(:get_snapshot, _from, state) do
    snapshot = %{
      timeout_remaining_ms: remaining_ms(state.timeout_due_at_ms),
      terminate_remaining_ms: remaining_ms(state.terminate_due_at_ms)
    }

    {:reply, snapshot, state}
  end

  def handle_call({:import_snapshot, snapshot}, _from, state) do
    timeout_ref =
      snapshot
      |> Map.get(:timeout_remaining_ms)
      |> schedule_if_positive(:trigger_timeout)

    terminate_ref =
      snapshot
      |> Map.get(:terminate_remaining_ms)
      |> schedule_if_positive(:trigger_terminate)

    imported_state = %{
      state
      | timeout_ref: timeout_ref,
        terminate_ref: terminate_ref,
        timeout_due_at_ms: due_at_ms(snapshot[:timeout_remaining_ms]),
        terminate_due_at_ms: due_at_ms(snapshot[:terminate_remaining_ms])
    }

    {:reply, :ok, imported_state}
  end

  def handle_info(:trigger_timeout, %{game_id: game_id} = state) do
    case Game.Context.trigger_timeout(game_id) do
      {:error, :handoff_in_progress} ->
        Logger.info("[handoff] #{inspect(%{phase: "timeout_deferred", game_id: game_id}, limit: :infinity)}")

        timeout_ref = Process.send_after(self(), :trigger_timeout, @retry_timeout_ms)

        {:noreply,
         %{
           state
           | timeout_ref: timeout_ref,
             timeout_due_at_ms: monotonic_now_ms() + @retry_timeout_ms
         }}

      _result ->
        {:noreply, %{state | timeout_ref: nil, timeout_due_at_ms: nil}}
    end
  rescue
    _e ->
      {:noreply, %{state | timeout_ref: nil, timeout_due_at_ms: nil}}
  end

  def handle_info(:trigger_terminate, %{game_id: game_id} = state) do
    Game.Context.terminate_game(game_id)
    {:noreply, %{state | terminate_ref: nil, terminate_due_at_ms: nil}}
  end

  def handle_info({_, :ok}, state) do
    {:noreply, state}
  end

  def handle_info({:DOWN, _ref, :process, _, _}, state) do
    {:noreply, state}
  end

  defp server_name(game_id), do: {:via, Registry, {Codebattle.Registry, "game_timeout_server:#{game_id}"}}

  defp monotonic_now_ms, do: System.monotonic_time(:millisecond)

  defp remaining_ms(nil), do: nil

  defp remaining_ms(due_at_ms) do
    max(due_at_ms - monotonic_now_ms(), 0)
  end

  defp due_at_ms(nil), do: nil
  defp due_at_ms(remaining_ms), do: monotonic_now_ms() + max(remaining_ms, 0)

  defp schedule_if_positive(value, _message) when value in [nil, 0], do: nil

  defp schedule_if_positive(remaining_ms, message) when is_integer(remaining_ms) do
    Process.send_after(self(), message, max(remaining_ms, 0))
  end
end
