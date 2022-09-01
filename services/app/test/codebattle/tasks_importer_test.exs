defmodule Codebattle.TasksImporterTest do
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

  test "uploads fixtures to database", %{
    path: path,
    issue_names: issue_names
  } do
    Codebattle.TasksImporter.upsert([path])

    task_names =
      Task
      |> Repo.all()
      |> Enum.map(fn task -> task.name end)
      |> MapSet.new()

    assert MapSet.equal?(task_names, issue_names)
  end

  test "is idempotent", %{path: path, issue_names: issue_names} do
    Codebattle.TasksImporter.upsert([path])
    Codebattle.TasksImporter.upsert([path])

    task_names =
      Task
      |> Repo.all()
      |> Enum.map(fn task -> task.name end)
      |> MapSet.new()

    assert MapSet.equal?(task_names, issue_names)
  end

  test "is correct signature", %{path: path, issue_names: _issue_names} do
    Codebattle.TasksImporter.upsert([path])

    task_signatures =
      Task
      |> Repo.all()
      |> Enum.map(fn task ->
        %{"input" => task.input_signature, "output" => task.output_signature}
      end)

    assert task_signatures ==
             [
               %{
                 "input" => [%{argument_name: "num", type: %{name: "integer"}}],
                 "output" => %{type: %{name: "integer"}}
               }
             ]
  end

  test "respects disabled" do
    path = Path.join(@root_dir, "test/support/fixtures/issues_with_disabled")
    Codebattle.TasksImporter.upsert([path])

    assert Repo.all(Task) |> Enum.count() == 2

    assert Repo.all(Task.visible(Task)) |> Enum.count() == 1
  end

  test "update fields", %{path: path} do
    new_path = Path.join(@root_dir, "test/support/fixtures/new_issues")

    Codebattle.TasksImporter.upsert([path])

    task = Task |> Repo.all() |> List.first()

    assert task.name == "asserts"
    assert task.description_en == "description"
    assert task.level == "medium"
    assert task.state == "active"
    assert task.visibility == "public"
    assert task.origin == "github"
    assert task.creator_id == nil
    assert task.input_signature == [%{argument_name: "num", type: %{name: "integer"}}]
    assert task.output_signature == %{type: %{name: "integer"}}
    assert task.asserts |> Enum.count() == 20

    Codebattle.TasksImporter.upsert([new_path])

    updated = Repo.get(Task, task.id)

    assert updated.name == "asserts"
    assert updated.state == "disabled"
    assert updated.visibility == "public"
    assert updated.origin == "github"
    assert updated.creator_id == nil
    assert updated.description_en == "new_description"
    assert updated.level == "easy"

    assert updated.input_signature == [
             %{argument_name: "str", type: %{name: "string"}}
           ]

    assert updated.output_signature == %{type: %{name: "string"}}
    assert updated.asserts |> Enum.count() == 1
    assert updated.id == task.id
  end
end
