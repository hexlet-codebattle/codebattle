defmodule Codebattle.Tournament.Tasks do
  def create_table do
    :ets.new(:t_tasks, [:set, :public, {:write_concurrency, true}, {:read_concurrency, true}])
  end

  def replace_tasks(tournament, tasks) do
    :ets.delete_all_objects(tournament.tasks_table)
    put_tasks(tournament, tasks)
  end

  def put_tasks(tournament, tasks) do
    Enum.each(tasks, &put_task(tournament, &1))
  end

  def put_task(tournament, task) do
    :ets.insert(tournament.tasks_table, {task.id, task})
  end

  def get_task_ids(tournament) do
    :ets.select(tournament.tasks_table, [{{:"$1", :"$2"}, [], [:"$1"]}])
  end

  def get_task_ids_by_level(tournament, level) do
    # TODO: make filter inside ets
    tournament
    |> get_tasks()
    |> Enum.filter(&(&1.level == level))
    |> Enum.map(& &1.id)
  end

  def get_task(_tournament, nil), do: nil

  def get_task(tournament, task_id) do
    :ets.lookup_element(tournament.tasks_table, task_id, 2)
  rescue
    _e ->
      nil
  end

  def get_tasks(tournament) do
    :ets.select(tournament.tasks_table, [{{:"$1", :"$2"}, [], [:"$2"]}])
  end

  def get_tasks(tournament, tasks_ids) when is_list(tasks_ids) do
    Enum.map(tasks_ids, fn task_id ->
      get_task(tournament, task_id)
    end)
  end

  def get_tasks(tournament, round) when is_integer(round) do
    :ets.select(tournament.tasks_table, [{{:"$1", round, :"$3"}, [], [:"$3"]}])
  end

  def count(tournament) do
    :ets.select_count(tournament.tasks_table, [{:_, [], [true]}])
  end
end
