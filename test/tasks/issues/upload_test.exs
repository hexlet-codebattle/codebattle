defmodule Tasks.Issues.UploadTest do
  use CodebattleWeb.ConnCase

  alias Codebattle.{Repo, Task}

  setup do
    path = File.cwd! |> Path.join("test/support/fixtures/issues")
    issue_names =
      File.ls!(path)
      |> Enum.map(fn(file_name) -> String.split(file_name, ".") |> List.first end)
      |> MapSet.new

    {:ok, %{path: path, issue_names: issue_names}}
  end

  test "uploads fixtures to database", %{path: path, issue_names: issue_names} do
    Mix.Tasks.Issues.Upload.run([path])

    task_names = Repo.all(Task)
      |> Enum.map(fn(task) -> task.name end)
      |> MapSet.new

    assert MapSet.equal?(task_names, issue_names)
  end

  test "is indempotent", %{path: path, issue_names: issue_names} do
    Mix.Tasks.Issues.Upload.run([path])
    Mix.Tasks.Issues.Upload.run([path])

    task_names = Repo.all(Task)
      |> Enum.map(fn(task) -> task.name end)
      |> MapSet.new

    assert MapSet.equal?(task_names, issue_names)
  end
end
