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

    signatures =
      issue_names
      |> Enum.map(fn issue_name ->
        YamlElixir.read_from_file!(Path.join(path, "#{issue_name}.yml"))
        |> Map.get("signature")
      end)
      |> MapSet.new()


   {:ok, %{path: path, issue_names: issue_names, signatures: signatures}}
  end

  test "uploads fixtures to database", %{path: path, issue_names: issue_names, signatures: _signatures} do
    Mix.Tasks.Issues.Upload.run([path])

    task_names =
      Task
      |> Repo.all()
      |> Enum.map(fn task -> task.name end)
      |> MapSet.new()

    assert MapSet.equal?(task_names, issue_names)
  end

  test "is idempotent", %{path: path, issue_names: issue_names, signatures: _signatures} do
    Mix.Tasks.Issues.Upload.run([path])
    Mix.Tasks.Issues.Upload.run([path])

    task_names =
      Task
      |> Repo.all()
      |> Enum.map(fn task -> task.name end)
      |> MapSet.new()

    assert MapSet.equal?(task_names, issue_names)
  end

  test "is correct signature", %{path: path, issue_names: _issue_names, signatures: signatures} do
    Mix.Tasks.Issues.Upload.run([path])

    task_signatures =
      Task
      |> Repo.all()
      |> Enum.map(fn task ->
        %{"input" => task.input_signature, "output" => task.output_signature}
      end)
      |> MapSet.new()

    assert MapSet.equal?(task_signatures, signatures)
  end
end
