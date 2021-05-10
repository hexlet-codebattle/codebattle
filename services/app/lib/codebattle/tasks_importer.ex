defmodule Codebattle.TasksImporter do
  @moduledoc "Periodically import asserts from github/battle_asserts to database"

  use GenServer

  require Logger

  @timeout :timer.hours(24)
  @issues_link "https://github.com/hexlet-codebattle/battle_asserts/releases/latest/download/issues.tar.gz"

  # API
  def start_link() do
    GenServer.start_link(__MODULE__, [], name: __MODULE__)
  end

  # SERVER
  def init(state) do
    Logger.info("Start Tasks Importer")
    Process.send_after(self(), :run_job, 10_000)
    {:ok, state}
  end

  def handle_info(:run_job, state) do
    fetch_issues()
    |> upsert()

    Process.send_after(self(), :run_job, @timeout)

    {:noreply, state}
  end

  def fetch_issues do
    File.rm_rf("/tmp/codebattle-issues")
    File.mkdir_p!("/tmp/codebattle-issues")
    dir_path = Temp.mkdir!(basedir: "/tmp/codebattle-issues")
    response = HTTPoison.get!(@issues_link, %{}, follow_redirect: true, timeout: 10_000)
    file_name = Path.join(dir_path, "issues.tar.gz")
    File.write!(file_name, response.body)

    System.cmd("tar", ["-xzf", file_name, "--directory", dir_path])
    Path.join(dir_path, "issues")
  end

  def upsert(path) do
    issue_names =
      path
      |> File.ls!()
      |> Enum.map(fn file_name ->
        file_name
        |> String.split(".")
        |> List.first()
      end)
      |> MapSet.new()
      |> Enum.filter(fn x -> String.length(x) > 0 end)

    Enum.each(issue_names, fn issue_name ->
      params = get_task_parmas(path, issue_name)

      Codebattle.Repo.insert!(
        struct(Codebattle.Task, params),
        on_conflict: [
          set: [
            examples: params.examples,
            description_en: params.description_en,
            description_ru: params.description_ru,
            disabled: params.disabled,
            level: params.level,
            input_signature: params.input_signature,
            output_signature: params.output_signature,
            asserts: params.asserts,
            tags: params.tags
          ]
        ],
        conflict_target: :name
      )
    end)
  end

  defp get_task_parmas(path, issue_name) do
    issue_info = YamlElixir.read_from_file!(Path.join(path, "#{issue_name}.yml"))

    asserts = File.read!(Path.join(path, "#{issue_name}.jsons"))
    signature = Map.get(issue_info, "signature")
    description = Map.get(issue_info, "description")

    %{
      name: issue_name,
      disabled: Map.get(issue_info, "disabled"),
      examples: Map.get(issue_info, "examples"),
      description_ru: Map.get(description, "ru"),
      description_en: Map.get(description, "en"),
      level: Map.get(issue_info, "level"),
      input_signature: Map.get(signature, "input"),
      output_signature: Map.get(signature, "output"),
      asserts: asserts,
      tags: Map.get(issue_info, "tags")
    }
  end
end
