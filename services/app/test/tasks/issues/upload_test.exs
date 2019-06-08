defmodule Tasks.Issues.UploadTest do
  use CodebattleWeb.ConnCase

  alias Codebattle.{Repo, Task}

  @root_dir File.cwd!()

  setup do
    path = Path.join(@root_dir, "test/support/fixtures/issues")

    issue_names =
      path
      |> File.ls!()
      |> Enum.map(fn file_name ->
        file_name
        |> String.split(".")
        |> List.first()
      end)
      |> MapSet.new()

    {:ok, %{path: path, issue_names: issue_names}}
  end

  test "uploads fixtures to database", %{path: path, issue_names: issue_names} do
    Mix.Tasks.Issues.Upload.run([path])

    task_names =
      Task
      |> Repo.all()
      |> Enum.map(fn task -> task.name end)
      |> MapSet.new()

    assert MapSet.equal?(task_names, issue_names)
  end

  test "is idempotent", %{path: path, issue_names: issue_names} do
    Mix.Tasks.Issues.Upload.run([path])
    Mix.Tasks.Issues.Upload.run([path])

    task_names =
      Task
      |> Repo.all()
      |> Enum.map(fn task -> task.name end)
      |> MapSet.new()

    assert MapSet.equal?(task_names, issue_names)
  end

  test "is correct input and output", %{path: path, issue_name: issue_names} do
    Mix.Tasks.Issue.Upload.run([path])

    {task_input, task_output} =
      Task
      |> Repo.all()
      |> Enum.map(fn task -> {task.input, task.output} end)

    assert task_input == "num:integer"
    assert task_output == "nil:integer"
  end
end
