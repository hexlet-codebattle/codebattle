defmodule Codebattle.GameProcess.TasksQueuesServerTest do
  use Codebattle.IntegrationCase

  alias Codebattle.Task
  alias Codebattle.GameProcess.TasksQueuesServer

  test "gets next task" do
    tasks = insert_list(2, :task, level: "easy")

    TasksQueuesServer.shuffle_task_ids()
    TasksQueuesServer.reshuffle_task_ids()

    assert %Task{} = task1 = TasksQueuesServer.get_task("easy")
    assert task1 in tasks

    assert %Task{} = task2 = TasksQueuesServer.get_task("easy")
    assert task2 in tasks
    assert task1 != task2

    assert TasksQueuesServer.get_task("easy") in tasks

    assert nil == TasksQueuesServer.get_task("hard")
  end

  test "distributes tasks equally" do
    insert_list(3, :task, level: "easy")
    TasksQueuesServer.shuffle_task_ids()

    fetched_tasks = for _i <- 1..12, do: TasksQueuesServer.get_task("easy").id

    grouped_ids =
      Enum.group_by(fetched_tasks, &Function.identity/1)
      |> Map.values()
      |> Enum.map(&Enum.count/1)

    assert 1 == grouped_ids |> Enum.uniq() |> Enum.count()
    assert 4 == grouped_ids |> List.first()
  end
end
