defmodule Codebattle.Tournament.TaskProvider do
  @moduledoc false
  alias Codebattle.TaskPack
  alias Codebattle.Tournament.Tasks

  def get_all_tasks(%{task_provider: "all"}) do
    Enum.shuffle(Codebattle.Task.get_all_visible())
  end

  def get_all_tasks(%{task_provider: "level", level: level}) do
    level |> Codebattle.Task.get_tasks_by_level() |> Enum.shuffle()
  end

  def get_all_tasks(%{task_provider: "task_pack", task_pack_name: tp_name}) when not is_nil(tp_name) do
    TaskPack.get_tasks_by_pack_name(tp_name)
  end

  def get_all_tasks(%{task_provider: "task_pack_per_round", task_pack_name: tp_name}) when not is_nil(tp_name) do
    tp_name
    |> get_task_pack_names()
    |> Enum.map(&TaskPack.get_tasks_by_pack_name/1)
    |> Enum.with_index(&{&2, &1})
    |> Map.new()
  end

  def get_round_task_ids(%{task_provider: "task_pack", task_strategy: "sequential", task_pack_name: tp_name}, _round)
      when not is_nil(tp_name) do
    [name: tp_name]
    |> TaskPack.get_by!()
    |> Map.get(:task_ids)
  end

  def get_round_task_ids(
        %{task_provider: "task_pack_per_round", task_strategy: "sequential", task_pack_name: tp_name},
        round
      )
      when not is_nil(tp_name) do
    tp_name
    |> get_task_pack_names()
    |> Enum.map(&TaskPack.get_by!(name: &1))
    |> Enum.at(round)
    |> Map.get(:task_ids)
  end

  def get_round_task_ids(tournament, round) do
    Tasks.get_task_ids(tournament, round)
  end

  def get_all_task_ids(tournament) do
    Tasks.get_task_ids(tournament)
  end

  def get_common_round_task_id(_tournament, %{task_id: task_id}) do
    if is_binary(task_id) do
      String.to_integer(task_id)
    else
      task_id
    end
  end

  def get_common_round_task_id(tournament, %{task_level: level}) do
    Tasks.get_random_task_id_by_level(tournament, level)
  end

  def get_common_round_task_id(%{task_strategy: "random_per_game"}, _params), do: nil

  def get_common_round_task_id(%{task_strategy: "random_per_round"} = tournament, _params) do
    safe_random(tournament.round_task_ids)
  end

  def get_common_round_task_id(%{task_strategy: "sequential"} = tournament, _params) do
    Enum.at(tournament.round_task_ids, 0)
  end

  def get_rematch_task(%{task_strategy: "sequential"} = tournament, completed_task_ids) do
    tournament.round_task_ids
    |> Enum.at(completed_task_ids |> Enum.uniq() |> Enum.count())
    |> case do
      nil -> nil
      task_id -> Tasks.get_task(tournament, task_id)
    end
  end

  def get_rematch_task(tournament, completed_task_ids) do
    (tournament.round_task_ids -- completed_task_ids)
    |> safe_random()
    |> case do
      nil -> nil
      task_id -> Tasks.get_task(tournament, task_id)
    end
  end

  def get_task(%{task_strategy: "sequential"} = tournament, nil) do
    tournament.round_task_ids
    |> List.first()
    |> case do
      nil -> nil
      task_id -> Tasks.get_task(tournament, task_id)
    end
  end

  def get_task(tournament, nil) do
    tournament.round_task_ids
    |> safe_random()
    |> then(&Tasks.get_task(tournament, &1))
  end

  def get_task(tournament, task_id) do
    Tasks.get_task(tournament, task_id)
  end

  defp safe_random(nil), do: nil
  defp safe_random([]), do: nil
  defp safe_random(list), do: Enum.random(list)

  defp get_task_pack_names(tp_name) do
    tp_name
    |> String.trim()
    |> String.split(",", trim: true)
    |> Enum.map(&String.trim/1)
  end
end
