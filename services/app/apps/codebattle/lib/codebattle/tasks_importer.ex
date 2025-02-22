defmodule Codebattle.TasksImporter do
  @moduledoc "Periodically import asserts from github/battle_asserts to database"

  use GenServer

  require Logger

  @timeout to_timeout(hour: 12)
  @issues_link "https://github.com/hexlet-codebattle/battle_asserts/releases/latest/download/issues.tar.gz"
  @tmp_basedir "/tmp/codebattle-issues"

  # API
  def start_link(_) do
    GenServer.start_link(__MODULE__, [], name: __MODULE__)
  end

  def run do
    GenServer.cast(__MODULE__, :run)
  end

  def run_sync do
    upsert(fetch_issues())
  end

  # SERVER
  def init(state) do
    Logger.debug("Start Tasks Importer")
    Process.send_after(self(), :run, to_timeout(second: 17))
    {:ok, state}
  end

  def handle_info(:run, state) do
    upsert(fetch_issues())
    Process.send_after(self(), :run, @timeout)
    {:noreply, state}
  end

  def handle_cast(:run, state) do
    upsert(fetch_issues())
    {:noreply, state}
  end

  def fetch_issues do
    File.rm_rf(@tmp_basedir)
    File.mkdir_p!(@tmp_basedir)
    dir_path = Temp.mkdir!(%{basedir: @tmp_basedir, prefix: to_string(:rand.uniform(10_000_000))})

    response = Req.get!(@issues_link)

    file_name = Path.join(dir_path, "issues.tar.gz")
    File.write!(file_name, response.body)

    System.cmd("tar", ["-xzf", file_name, "--directory", dir_path])
    Path.join(dir_path, "issues")
  end

  def upsert(path) do
    issue_names =
      path
      |> File.ls!()
      |> MapSet.new(fn file_name ->
        file_name
        |> String.split(".")
        |> List.first()
      end)
      |> Enum.filter(fn x -> String.length(x) > 0 end)

    Enum.each(issue_names, fn issue_name ->
      path
      |> get_task_params(issue_name)
      |> Codebattle.Task.upsert!()
    end)
  end

  defp get_task_params(path, issue_name) do
    issue_info = YamlElixir.read_from_file!(Path.join(path, "#{issue_name}.yml"))

    asserts = path |> Path.join("#{issue_name}.json") |> File.read!() |> Jason.decode!()
    signature = Map.get(issue_info, "signature", %{})
    description = Map.get(issue_info, "description")

    state =
      if Map.get(issue_info, "disabled") do
        "disabled"
      else
        "active"
      end

    input_signature = Enum.map(Map.get(signature, "input", []), &format_input_signature/1)

    %{
      name: issue_name,
      examples: Map.get(issue_info, "examples"),
      description_ru: Map.get(description, "ru"),
      description_en: Map.get(description, "en"),
      level: Map.get(issue_info, "level"),
      input_signature: input_signature,
      output_signature: Map.get(signature, "output", []),
      asserts: asserts,
      tags: Map.get(issue_info, "tags", []),
      origin: "github",
      state: state,
      visibility: "public",
      creator_id: nil
    }
  end

  defp format_input_signature(%{"argument-name" => arg} = input) do
    input |> Map.delete("argument-name") |> Map.put("argument_name", arg)
  end

  defp format_input_signature(map), do: map
end
