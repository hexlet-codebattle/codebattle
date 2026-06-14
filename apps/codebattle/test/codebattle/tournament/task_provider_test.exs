defmodule Codebattle.Tournament.TaskProviderTest do
  use Codebattle.DataCase, async: false

  alias Codebattle.Tournament
  alias Codebattle.Tournament.TaskProvider

  test "reads task ids from task packs and current tournament storage" do
    [task1, task2, task3] = insert_list(3, :task, level: "easy")
    insert(:task_pack, name: "provider-pack", task_ids: [task1.id, task2.id, task3.id])

    sequential =
      struct!(Tournament, %{
        task_provider: "task_pack",
        task_strategy: "sequential",
        task_pack_name: "provider-pack"
      })

    random =
      struct!(Tournament, %{
        task_provider: "task_pack",
        task_strategy: "random",
        task_pack_name: "provider-pack"
      })

    assert TaskProvider.get_task_ids(sequential) == [task1.id, task2.id, task3.id]
    assert Enum.sort(TaskProvider.get_task_ids(random)) == [task1.id, task2.id, task3.id]
  end

  test "returns rematch tasks for sequential and random strategies" do
    [task1, task2, task3] = insert_list(3, :task, level: "easy")
    tournament = build_ets_tournament(%{task_ids: [task1.id, task2.id, task3.id]})

    Tournament.Tasks.put_tasks(tournament, [task1, task2, task3])

    sequential = %{tournament | task_strategy: "sequential"}
    random = %{tournament | task_strategy: "random"}

    assert TaskProvider.get_rematch_task(sequential, [task1.id]).id == task2.id
    assert TaskProvider.get_rematch_task(sequential, [task1.id, task2.id]).id == task3.id
    assert TaskProvider.get_rematch_task(sequential, [task1.id, task2.id, task3.id]) == nil

    assert TaskProvider.get_rematch_task(random, [task1.id, task2.id]).id == task3.id
    assert TaskProvider.get_rematch_task(random, [task1.id, task2.id, task3.id]) == nil
  end

  test "task_pack + per_round_pair: get_task_ids возвращает task_ids пака в исходном порядке, обрезанные до rounds_limit*2" do
    [t1, t2, t3, t4, t5] = insert_list(5, :task, level: "easy")
    insert(:task_pack, name: "ordered-pack", task_ids: [t1.id, t2.id, t3.id, t4.id, t5.id])

    tournament =
      struct!(Tournament, %{
        task_provider: "task_pack",
        task_strategy: "per_round_pair",
        task_pack_name: "ordered-pack",
        rounds_limit: 2
      })

    # Must preserve pack order (per_round_pair uses task_ids[round*2] / [round*2+1])
    # and trim to rounds_limit * 2 = 4 tasks.
    assert TaskProvider.get_task_ids(tournament) == [t1.id, t2.id, t3.id, t4.id]
  end

  test "per_round_pair strategy: get_all_tasks берёт 2 × rounds_limit задач (по 2 на раунд)" do
    insert_list(20, :task, level: "easy")

    tournament =
      struct!(Tournament, %{
        task_provider: "level",
        task_strategy: "per_round_pair",
        level: "easy",
        rounds_limit: 8
      })

    tasks = TaskProvider.get_all_tasks(tournament)
    assert length(tasks) == 16

    # без per_round_pair — старое поведение, 1 задача на раунд
    sequential = %{tournament | task_strategy: "sequential"}
    assert length(TaskProvider.get_all_tasks(sequential)) == 8
  end

  test "per_round_pair strategy: round N → task[2N] (first game) и task[2N+1] (rematch)" do
    [t0a, t0b, t1a, t1b] = insert_list(4, :task, level: "easy")

    tournament =
      build_ets_tournament(%{
        task_strategy: "per_round_pair",
        current_round_position: 0,
        task_ids: [t0a.id, t0b.id, t1a.id, t1b.id]
      })

    Tournament.Tasks.put_tasks(tournament, [t0a, t0b, t1a, t1b])

    # Round 0
    assert TaskProvider.get_task(tournament, nil).id == t0a.id
    assert TaskProvider.get_rematch_task(tournament, [t0a.id]).id == t0b.id

    # Round 1
    round1 = %{tournament | current_round_position: 1}
    assert TaskProvider.get_task(round1, nil).id == t1a.id
    assert TaskProvider.get_rematch_task(round1, [t0a.id, t0b.id, t1a.id]).id == t1b.id

    # Out of range
    assert TaskProvider.get_task(%{tournament | current_round_position: 2}, nil) == nil
    assert TaskProvider.get_rematch_task(%{tournament | current_round_position: 2}, []) == nil
  end

  test "returns task for current round and explicit task id" do
    [task1, task2] = insert_list(2, :task, level: "easy")
    tournament = build_ets_tournament(%{current_round_position: 1, task_ids: [task1.id, task2.id]})

    Tournament.Tasks.put_tasks(tournament, [task1, task2])

    assert TaskProvider.get_task(tournament, nil).id == task2.id
    assert TaskProvider.get_task(tournament, task1.id).id == task1.id
    assert TaskProvider.get_task(%{tournament | current_round_position: 5}, nil) == nil
  end

  defp build_ets_tournament(attrs) do
    tournament_id = System.unique_integer([:positive, :monotonic])

    tournament =
      struct!(
        Tournament,
        Map.merge(
          %{
            id: tournament_id,
            type: "swiss",
            task_provider: "task_pack",
            task_strategy: "sequential",
            task_ids: [],
            current_round_position: 0,
            tasks_table: Tournament.Tasks.create_table(tournament_id)
          },
          attrs
        )
      )

    on_exit(fn -> safe_delete_ets(tournament.tasks_table) end)

    tournament
  end

  defp safe_delete_ets(table) do
    :ets.delete(table)
  rescue
    _ -> :ok
  end
end
