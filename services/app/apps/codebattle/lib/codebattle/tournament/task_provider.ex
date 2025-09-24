defmodule Codebattle.Tournament.TaskProvider do
  @moduledoc false
  alias Codebattle.TaskPack
  alias Codebattle.Tournament.Tasks

  def get_all_tasks(%{task_provider: "all"} = tournament) do
    Codebattle.Task.get_all_visible()
    |> Enum.take(tournament.rounds_limit)
    |> Enum.shuffle()
  end

  def get_all_tasks(%{task_provider: "level", level: level} = tournament) do
    level
    |> Codebattle.Task.get_tasks_by_level()
    |> Enum.take(tournament.rounds_limit)
    |> Enum.shuffle()
  end

  def get_all_tasks(%{task_provider: "task_pack", task_pack_name: tp_name} = tournament) when not is_nil(tp_name) do
    tp_name
    |> TaskPack.get_tasks_by_pack_name()
    |> Enum.take(tournament.rounds_limit)
  end

  def get_task_ids(%{task_provider: "task_pack", task_strategy: "sequential", task_pack_name: tp_name}, _round)
      when not is_nil(tp_name) do
    [name: tp_name]
    |> TaskPack.get_by!()
    |> Map.get(:task_ids)
  end

  def get_task_ids(%{task_provider: "task_pack", task_strategy: "random", task_pack_name: tp_name}, _round)
      when not is_nil(tp_name) do
    [name: tp_name]
    |> TaskPack.get_by!()
    |> Map.get(:task_ids)
    |> Enum.shuffle()
  end

  def get_task_ids(tournament) do
    Tasks.get_task_ids(tournament)
  end

  # TODO: implement custom rounds with rematches
  def get_rematch_task(%{task_strategy: "sequential"} = tournament, completed_task_ids) do
    tournament.task_ids
    |> Enum.at(completed_task_ids |> Enum.uniq() |> Enum.count())
    |> case do
      nil -> nil
      task_id -> Tasks.get_task(tournament, task_id)
    end
  end

  def get_rematch_task(tournament, completed_task_ids) do
    (tournament.task_ids -- completed_task_ids)
    |> safe_random()
    |> case do
      nil -> nil
      task_id -> Tasks.get_task(tournament, task_id)
    end
  end

  def get_task(%{task_strategy: "sequential", current_round_position: round} = tournament, nil) do
    tournament.task_ids
    |> Enum.at(round)
    |> case do
      nil -> nil
      task_id -> Tasks.get_task(tournament, task_id)
    end
  end

  def get_task(tournament, nil) do
    tournament.task_ids
    |> safe_random()
    |> then(&Tasks.get_task(tournament, &1))
  end

  def get_task(tournament, task_id) do
    Tasks.get_task(tournament, task_id)
  end

  defp safe_random(nil), do: nil
  defp safe_random([]), do: nil
  defp safe_random(list), do: Enum.random(list)
end
