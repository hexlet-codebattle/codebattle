defmodule Codebattle.GameProcess.TasksQueuesServer do
  @moduledoc "Gen server for tasks queues"

  use GenServer

  @reshuffle_timeout :timer.hours(7)

  ## Client API

  def start_link(_) do
    GenServer.start_link(__MODULE__, %{}, name: __MODULE__)
  end

  def get_task(level) do
    GenServer.call(__MODULE__, {:next_task, level})
  end

  def shuffle_task_ids do
    GenServer.cast(__MODULE__, :set_shuffled_task_ids)
  end

  def reshuffle_task_ids do
    GenServer.cast(__MODULE__, :reshuffle_task_ids)
  end

  ## Server callbacks

  def init(_) do
    initial_state = %{
      task_ids: %{},
      cursors: initial_cursors()
    }

    Process.send_after(self(), :reshuffle_task_ids, @reshuffle_timeout)
    {:ok, initial_state}
  end

  def handle_cast(:set_shuffled_task_ids, state) do
    {:noreply, %{state | task_ids: fetch_task_ids()}}
  end

  def handle_cast(:reshuffle_task_ids, state) do
    Process.send_after(self(), :reshuffled_task_ids, @reshuffle_timeout)
    {:noreply, %{state | task_ids: fetch_task_ids()}}
  end

  def handle_call({:next_task, level}, _from, state) do
    cursor = Map.get(state.cursors, level)

    case Map.get(state.task_ids, level) do
      [] ->
        case fetch_task_ids(level) do
          [] ->
            {:reply, nil, state}

          task_ids ->
            id = Enum.at(task_ids, 0)
            task = Codebattle.Task.get!(id)
            new_cursors = Map.put(state.cursors, level, 1)
            new_task_ids = Map.put(state.task_ids, level, task_ids)

            {:reply, task, %{state | cursors: new_cursors, task_ids: new_task_ids}}
        end

      task_ids ->
        id = Enum.at(task_ids, rem(cursor, length(task_ids)))
        task = Codebattle.Task.get!(id)

        new_cursors = Map.put(state.cursors, level, cursor + 1)
        {:reply, task, %{state | cursors: new_cursors}}
    end
  end

  ## Helpers
  defp initial_cursors do
    Enum.reduce(Codebattle.Task.levels(), %{}, fn level, acc ->
      Map.put(acc, level, 1)
    end)
  end

  defp fetch_task_ids(level), do: Codebattle.Task.get_shuffled_task_ids(level)

  defp fetch_task_ids do
    Enum.reduce(Codebattle.Task.levels(), %{}, fn level, acc ->
      Map.put(acc, level, fetch_task_ids(level))
    end)
  end
end
