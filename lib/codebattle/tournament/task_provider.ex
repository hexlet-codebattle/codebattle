defmodule Codebattle.Tournament.TaskProvider do
  @moduledoc false
  alias Codebattle.TaskPack
  alias Codebattle.Tournament.Tasks

  @levels ~w(elementary easy medium hard)

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

  def get_all_tasks(%{task_provider: "level_progression"} = tournament) do
    tournament
    |> level_plan()
    |> Enum.frequencies()
    |> Enum.flat_map(fn {level, count} ->
      level
      |> Codebattle.Task.get_tasks_by_level()
      |> Enum.shuffle()
      |> Enum.take(count)
    end)
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

  # The preloaded tasks in plan order: each round takes a task of its planned level; a level
  # that ran short borrows any unused task so every round still has one.
  def get_task_ids(%{task_provider: "level_progression"} = tournament) do
    pools =
      tournament
      |> Tasks.get_tasks()
      |> Enum.sort_by(& &1.id)
      |> Enum.group_by(& &1.level, & &1.id)

    {planned, pools} =
      tournament
      |> level_plan()
      |> Enum.map_reduce(pools, fn level, pools ->
        case Map.get(pools, level, []) do
          [id | rest] -> {id, Map.put(pools, level, rest)}
          [] -> {nil, pools}
        end
      end)

    spare = pools |> Map.values() |> List.flatten()

    planned
    |> Enum.map_reduce(spare, fn
      nil, [id | rest] -> {id, rest}
      id, spare -> {id, spare}
    end)
    |> elem(0)
    |> Enum.reject(&is_nil/1)
  end

  def get_task_ids(tournament) do
    Tasks.get_task_ids(tournament)
  end

  @doc """
  Task level per round for `level_progression`: rounds get harder, never above the
  tournament's `level`. With "easy" the rounds split evenly, elementary first. Otherwise a
  quarter elementary, then easy, then about 3/8 medium; with "hard" the last round is hard.
  4 rounds with "easy" → 2 elementary, 2 easy; 4 with "medium" → elementary, easy, easy,
  medium; 10 with "hard" → 2 elementary, 4 easy, 3 medium, 1 hard.
  """
  @spec level_plan(map()) :: [String.t()]
  def level_plan(%{rounds_limit: rounds, level: "easy"}) when is_integer(rounds) and rounds > 0 do
    elementary = div(rounds + 1, 2)
    List.duplicate("elementary", elementary) ++ List.duplicate("easy", rounds - elementary)
  end

  def level_plan(%{rounds_limit: rounds, level: top}) when is_integer(rounds) and rounds > 0 do
    hard = if top == "hard" and rounds >= 4, do: 1, else: 0
    elementary = max(div(rounds, 4), 1)
    medium = if rounds >= 3, do: max(div(rounds * 3, 8), 1), else: 0
    easy = rounds - elementary - medium - hard

    [{"elementary", elementary}, {"easy", easy}, {"medium", medium}, {"hard", hard}]
    |> Enum.flat_map(fn {level, count} -> List.duplicate(level, count) end)
    |> Enum.map(&cap_level(&1, top))
  end

  def level_plan(_tournament), do: []

  defp cap_level(level, top) do
    case Enum.find_index(@levels, &(&1 == top)) do
      nil -> level
      top_index -> Enum.at(@levels, min(Enum.find_index(@levels, &(&1 == level)), top_index))
    end
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
