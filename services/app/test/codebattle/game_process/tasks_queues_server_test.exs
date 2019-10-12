defmodule Codebattle.GameProcess.TasksQueuesServerTest do
  use Codebattle.IntegrationCase

  alias Codebattle.Task
  alias Codebattle.GameProcess.TasksQueuesServer

  setup do
    first_task = insert(:task, %{level: "easy"})
    second_task = insert(:task, %{level: "easy"})

    %{tasks_list: [first_task, second_task]}
  end

  test "gets next task", %{tasks_list: tasks_list} do
    assert %Task{} = task1 = TasksQueuesServer.call_next_task("easy")
    assert task1 in tasks_list

    assert %Task{} = task2 = TasksQueuesServer.call_next_task("easy")
    assert task2 in tasks_list
    assert task1 != task2

    assert TasksQueuesServer.call_next_task("easy") in tasks_list
  end
end
