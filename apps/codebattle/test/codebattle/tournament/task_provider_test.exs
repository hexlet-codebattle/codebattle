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
