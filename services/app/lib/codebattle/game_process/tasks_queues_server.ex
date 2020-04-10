defmodule Codebattle.GameProcess.TasksQueuesServer do
  @moduledoc "Gen server for tasks queues"

  use GenServer

  alias Codebattle.{Repo, Task}

  ## Client API

  def start_link do
    GenServer.start_link(__MODULE__, %{}, name: __MODULE__)
  end

  def get_task(level) do
    GenServer.call(__MODULE__, {:next_task, level})
  end

  ## Server callbacks

  def init(_) do
    levels = ["elementary", "easy", "medium", "hard"]

    tasks_queues =
      Enum.reduce(levels, %{}, fn level, acc ->
        Map.put(acc, level, Task.get_shuffled_tasks(level))
      end)

    {:ok, tasks_queues}
  end

  def handle_call({:next_task, level}, _from, tasks_queues) do
    [next_task, tail_tasks] =
      case Map.fetch!(tasks_queues, level) do
        [next_task | tail_tasks] ->
          [next_task, tail_tasks]

        _any ->
          [next_task | tail_tasks] = Task.get_shuffled_tasks(level)
          [next_task, tail_tasks]
      end

    new_tasks_queues = Map.put(tasks_queues, level, tail_tasks)

    {:reply, next_task, new_tasks_queues}
  end

  ## Helpers
end
