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
    {:ok, %{count: 0, executed_list: [], waiting_list: []}}
  end

  def handle_call({:registry, spec}, _from, state) do
    seed = to_string(:rand.uniform(10_000_000))
    run_id = "#{seed}_#{spec}"

    new_state =
      if state.count >= Application.get_env(:runner, :max_parallel_containers_run) do
        %{
          count: state.count + 1,
          executed_list: state.executed_list,
          waiting_list: state.waiting_list ++ [run_id]
        }
      else
        %{
          count: state.count + 1,
          executed_list: state.executed_list ++ [run_id],
          waiting_list: state.waiting_list
        }
      end

    Logger.error("registry container: #{run_id}")

    {:reply, {:ok, run_id}, new_state}
  end

  def handle_call({:check_run_status, run_id}, _from, state) do
    if Enum.any?(state.executed_list, fn id -> id == run_id end) do
      Logger.error("execute container run: #{run_id}, container counts: #{state.count}")
      {:reply, {:ok, :run}, state}
    else
      Logger.error("wait container run: #{run_id}, container counts: #{state.count}")
      {:reply, {:ok, {:wait, 500}}, state}
    end
  end

  def handle_cast({:unregistry, run_id}, state) do
    count = state.count - 1
    filtered_executed_list = Enum.filter(state.executed_list, &(run_id != &1))
    filtered_waiting_list = Enum.filter(state.waiting_list, &(run_id != &1))

    new_state =
      if length(filtered_executed_list) <
           Application.get_env(:runner, :max_parallel_containers_run) &&
           length(filtered_waiting_list) > 0 do
        [first | rest_waiting_list] = filtered_waiting_list

        %{
          count: count,
          executed_list: filtered_executed_list ++ [first],
          waiting_list: rest_waiting_list
        }
      else
        %{
          count: count,
          executed_list: filtered_executed_list,
          waiting_list: filtered_waiting_list
        }
      end

    Logger.error("unregistry container: #{run_id}")

    {:noreply, new_state}
  end
end
