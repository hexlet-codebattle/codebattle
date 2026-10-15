defmodule Codebattle.Tournament.TaskProvider do
  @moduledoc false
  alias Codebattle.TaskPack
  alias Codebattle.Tournament.Tasks

  def get_all_tasks(%{task_provider: "all"} = tournament) do
    Codebattle.Task.get_all_visible()
    |> Enum.shuffle()
    |> Enum.take(tasks_needed_count(tournament))
  end

  def get_all_tasks(%{task_provider: "level", level: level} = tournament) do
    level
    |> Codebattle.Task.get_tasks_by_level()
    |> Enum.shuffle()
    |> Enum.take(tasks_needed_count(tournament))
  end

  def get_all_tasks(%{task_provider: "task_pack", task_pack_name: tp_name} = tournament) when not is_nil(tp_name) do
    tp_name
    |> TaskPack.get_tasks_by_pack_name()
    |> Enum.take(tasks_needed_count(tournament))
  end

  # Сколько задач реально нужно за весь турнир. Для per_round_pair — 2 на раунд.
  defp tasks_needed_count(%{task_strategy: "per_round_pair", rounds_limit: n}) when is_integer(n), do: n * 2
  defp tasks_needed_count(%{rounds_limit: n}) when is_integer(n), do: n
  defp tasks_needed_count(_), do: 0

  def get_task_ids(%{task_provider: "task_pack", task_strategy: "sequential", task_pack_name: tp_name})
      when not is_nil(tp_name) do
    [name: tp_name]
    |> TaskPack.get_by!()
    |> Map.get(:task_ids)
  end

  def get_task_ids(%{task_provider: "task_pack", task_strategy: "random", task_pack_name: tp_name})
      when not is_nil(tp_name) do
    [name: tp_name]
    |> TaskPack.get_by!()
    |> Map.get(:task_ids)
    |> Enum.shuffle()
  end

  # per_round_pair must preserve the pack's order so task_ids[round*2] / [round*2+1] is stable.
  def get_task_ids(%{task_provider: "task_pack", task_strategy: "per_round_pair", task_pack_name: tp_name} = tournament)
      when not is_nil(tp_name) do
    [name: tp_name]
    |> TaskPack.get_by!()
    |> Map.get(:task_ids)
    |> Enum.take(tasks_needed_count(tournament))
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

  # Раунд N: первая игра — task_ids[2N], ремач — task_ids[2N+1].
  def get_rematch_task(%{task_strategy: "per_round_pair", current_round_position: round} = tournament, _completed) do
    tournament.task_ids
    |> Enum.at(round * 2 + 1)
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

  def get_task(%{task_strategy: "per_round_pair", current_round_position: round} = tournament, nil) do
    tournament.task_ids
    |> Enum.at(round * 2)
    |> case do
      nil -> nil
      task_id -> Tasks.get_task(tournament, task_id)
    end
  end

  def get_task(%{current_round_position: round} = tournament, nil) do
    tournament.task_ids
    |> Enum.at(round)
    |> case do
      nil -> nil
      task_id -> Tasks.get_task(tournament, task_id)
    end
  end

  def get_task(tournament, task_id) do
    Tasks.get_task(tournament, task_id)
  end

  defp safe_random([]), do: nil
  defp safe_random(list), do: Enum.random(list)
end
