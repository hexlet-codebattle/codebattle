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

    signatures =
      issue_names
      |> Enum.map(fn issue_name ->
        YamlElixir.read_from_file!(Path.join(path, "#{issue_name}.yml"))
        |> Map.get("signature")
      end)
      |> MapSet.new()

    {:ok, %{path: path, issue_names: issue_names, signatures: signatures}}
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

  test "is idempotent", %{path: path, issue_names: issue_names, signatures: _signatures} do
    Codebattle.TasksImporter.upsert([path])
    Codebattle.TasksImporter.upsert([path])

    task_names =
      Task
      |> Repo.all()
      |> Enum.map(fn task -> task.name end)
      |> MapSet.new()

    assert MapSet.equal?(task_names, issue_names)
  end

  test "is correct signature", %{path: path, issue_names: _issue_names, signatures: signatures} do
    Codebattle.TasksImporter.upsert([path])

    task_signatures =
      Task
      |> Repo.all()
      |> Enum.map(fn task ->
        %{"input" => task.input_signature, "output" => task.output_signature}
      end)
      |> MapSet.new()

    assert MapSet.equal?(task_signatures, signatures)
  end

  test "respect disabled" do
    path = Path.join(@root_dir, "test/support/fixtures/issues_with_disabled")
    Codebattle.TasksImporter.upsert([path])

    assert Repo.all(Task) |> Enum.count() == 2

    assert Repo.all(Task.invisible(Task)) |> Enum.count() == 1

    assert Repo.all(Task.visible(Task)) |> Enum.count() == 1
  end

  test "update fields", %{path: path} do
    new_path = Path.join(@root_dir, "test/support/fixtures/new_issues")

    Codebattle.TasksImporter.upsert([path])

    task = Task |> Repo.all() |> List.first()

    assert task.name == "asserts"
    assert task.description == "description"
    assert task.level == "medium"
    assert task.input_signature == [%{"argument-name" => "num", "type" => %{"name" => "integer"}}]
    assert task.output_signature == %{"type" => %{"name" => "integer"}}
    assert task.asserts |> String.split("\n") |> Enum.count() == 21

    Codebattle.TasksImporter.upsert([new_path])

    [new_task] = Repo.all(Task)

    assert new_task.name == "asserts"
    assert new_task.disabled == true
    assert new_task.description == "new_description"
    assert new_task.level == "easy"

    assert new_task.input_signature == [
             %{"argument-name" => "str", "type" => %{"name" => "string"}}
           ]

    assert new_task.output_signature == %{"type" => %{"name" => "string"}}
    assert new_task.asserts |> String.split("\n") |> Enum.count() == 2
    assert new_task.id == task.id
  end
end
