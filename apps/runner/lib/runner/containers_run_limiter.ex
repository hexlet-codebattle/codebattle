defmodule Runner.StateContainersRunLimiter do
  @moduledoc false

  use GenServer
  require Logger

  def start_link(_) do
    GenServer.start(__MODULE__, [], name: __MODULE__)
  end

  def registry_container(spec) do
    GenServer.call(__MODULE__, {:registry, spec})
  end

  def check_run_status(run_id) do
    GenServer.call(__MODULE__, {:check_run_status, run_id})
  end

  def unregistry_container(run_id) do
    GenServer.cast(__MODULE__, {:unregistry, run_id})
  end

  def init(_state \\ []) do
    {:ok, %{count: 0, executed_set: MapSet.new(), waiting_queue: :queue.new()}}
  end

  def handle_call({:registry, {lang_slug, timeout_ms}}, _from, state) do
    seed = to_string(:rand.uniform(10_000_000))
    run_id = "#{seed}_#{lang_slug}"
    Process.send_after(self(), {:unregistry, run_id}, timeout_ms + 100)

    new_state =
      if state.count >= Application.get_env(:runner, :max_parallel_containers_run) do
        %{
          count: state.count + 1,
          executed_set: state.executed_set,
          waiting_queue: :queue.in(run_id, state.waiting_queue)
        }
      else
        %{
          count: state.count + 1,
          executed_set: MapSet.put(state.executed_set, run_id),
          waiting_queue: state.waiting_queue
        }
      end

    Logger.info("registry container: #{inspect({run_id, lang_slug, timeout_ms})}")

    {:reply, {:ok, run_id}, new_state}
  end

  def handle_call({:check_run_status, run_id}, _from, state) do
    if MapSet.member?(state.executed_set, run_id) do
      Logger.info("execute container run: #{run_id}, container counts: #{state.count}")
      {:reply, {:ok, :run}, state}
    else
      Logger.error("wait container run: #{run_id}, container counts: #{state.count}")
      {:reply, {:ok, {:wait, 500}}, state}
    end
  end

  def handle_cast({:unregistry, run_id}, state) do
    {:noreply, unregistry(state, run_id)}
  end

  def handle_info({:unregistry, run_id}, state) do
    {:noreply, unregistry(state, run_id)}
  end

  defp unregistry(state, run_id) do
    filtered_executed_set = MapSet.delete(state.executed_set, run_id)
    filtered_waiting_queue = :queue.delete(run_id, state.waiting_queue)
    count = MapSet.size(filtered_executed_set) + :queue.len(filtered_waiting_queue)

    Logger.info("unregistry container: #{run_id}")

    if MapSet.size(filtered_executed_set) <
         Application.get_env(:runner, :max_parallel_containers_run) &&
         !:queue.is_empty(filtered_waiting_queue) do
      {{:value, to_run_id}, rest_waiting_queue} = :queue.out(filtered_waiting_queue)

      %{
        count: count,
        executed_set: MapSet.put(filtered_executed_set, to_run_id),
        waiting_queue: rest_waiting_queue
      }
    else
      %{
        count: count,
        executed_set: filtered_executed_set,
        waiting_queue: filtered_waiting_queue
      }
    end
  end
end
