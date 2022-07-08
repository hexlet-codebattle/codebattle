defmodule Codebattle.TasksImporter do
  @moduledoc "Periodically import asserts from github/battle_asserts to database"

  use GenServer

  require Logger

  @timeout :timer.hours(24)
  @issues_link "https://github.com/hexlet-codebattle/battle_asserts/releases/latest/download/issues.tar.gz"

  # API
  def start_link(_) do
    GenServer.start_link(__MODULE__, [], name: __MODULE__)
  end

  def run do
    GenServer.cast(__MODULE__, :run)
  end

  # SERVER
  def init(state) do
    Logger.info("Start Tasks Importer")
    Process.send_after(self(), :run, :timer.seconds(17))
    {:ok, state}
  end

  def handle_info(:run, state) do
    fetch_issues() |> upsert()
    Process.send_after(self(), :run, @timeout)
    {:noreply, state}
  end

  def handle_cast(:run, state) do
    fetch_issues() |> upsert()
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
      path
      |> get_task_params(issue_name)
      |> Codebattle.Task.upsert!()
    end)
  end

  defp get_task_params(path, issue_name) do
    issue_info = YamlElixir.read_from_file!(Path.join(path, "#{issue_name}.yml"))

    asserts = path |> Path.join("#{issue_name}.json") |> File.read!() |> Jason.decode!()
    signature = Map.get(issue_info, "signature")
    description = Map.get(issue_info, "description")

    state =
      if Map.get(issue_info, "disabled") do
        "disabled"
      else
        "active"
      end

    input_signature = Enum.map(Map.get(signature, "input"), &format_input_signature/1)

    %{
      name: issue_name,
      examples: Map.get(issue_info, "examples"),
      description_ru: Map.get(description, "ru"),
      description_en: Map.get(description, "en"),
      level: Map.get(issue_info, "level"),
      input_signature: input_signature,
      output_signature: Map.get(signature, "output"),
      asserts: asserts,
      tags: Map.get(issue_info, "tags"),
      origin: "github",
      state: state,
      visibility: "public",
      creator_id: nil
    }
  end

  defp format_input_signature(input = %{"argument-name" => arg}) do
    input |> Map.delete("argument-name") |> Map.put("argument_name", arg)
  end

  defp format_input_signature(map), do: map
end
