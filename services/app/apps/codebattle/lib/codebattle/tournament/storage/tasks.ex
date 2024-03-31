defmodule Codebattle.Tournament.Tasks do
  def create_table(id) do
    :ets.new(
      :"t_#{id}_tasks",
      [
        :set,
        :public,
        {:write_concurrency, true},
        {:read_concurrency, true}
      ]
    )
  end

  def put_tasks(tournament, tasks) when is_map(tasks) do
    Enum.map(tasks, fn {round, round_tasks} ->
      Enum.each(round_tasks, &put_task(tournament, &1, round))
    end)
  end

  def put_tasks(tournament, tasks, round \\ nil) when is_list(tasks) do
    Enum.each(tasks, &put_task(tournament, &1, round))
  end

  def put_task(tournament, task, round \\ nil) do
    :ets.insert(tournament.tasks_table, {task.id, task.level, round, task})
  end

  def get_task_ids(tournament, round \\ nil) do
    :ets.select(tournament.tasks_table, [{{:"$1", :"$2", round, :"$4"}, [], [:"$1"]}])
  end

  def get_random_task_id_by_level(tournament, level) do
    # TODO: think about to use Codebattle.Game.TasksQueuesServer for levels, to avoid dups
    tournament.tasks_table
    |> :ets.select([{{:"$1", level, :"$3", :"$4"}, [], [:"$1"]}])
    |> Enum.random()
  end

  def get_task(_tournament, nil), do: nil

  def get_task(tournament, task_id) do
    :ets.lookup_element(tournament.tasks_table, task_id, 4)
  rescue
    _e ->
      nil
  end

  def get_tasks(tournament) do
    :ets.select(tournament.tasks_table, [{{:"$1", :"$2", :"$3", :"$4"}, [], [:"$4"]}])
  end

  def get_tasks(tournament, tasks_ids) when is_list(tasks_ids) do
    Enum.map(tasks_ids, fn task_id ->
      get_task(tournament, task_id)
    end)
  end

  def get_tasks(tournament, round) when is_integer(round) do
    :ets.select(tournament.tasks_table, [{{:"$1", round, :"$3", :"$4"}, [], [:"$4"]}])
  end

  def count(tournament) do
    :ets.select_count(tournament.tasks_table, [{:_, [], [true]}])
  end
end
