defmodule Codebattle.AssertsImporter do
  @moduledoc "Periodically import asserts from github/battle_asserts to database"

  # TODO: add tests, make code more pretty

  use GenServer

  require Logger

  # 24 hours
  @timeout 24 * 60 * 60 * 1000
  @issues_link "https://github.com/hexlet-codebattle/battle_asserts/releases/latest/download/issues.tar.gz"
  @issues_path "/tmp/codebattle.tar.gz"

  # API
  def start_link() do
    GenServer.start_link(__MODULE__, [], name: __MODULE__)
  end

  # SERVER
  def init(state) do
    Logger.info("Start Asserts Importer")
    Process.send_after(self(), :run_job, 10_000)
    {:ok, state}
  end

  def handle_info(:run_job, _state) do
    call
    Process.send_after(self(), :run_job, @timeout)
    {:noreply, %{}}
  end

  def call do
    File.rm_rf("/tmp/codebattle-issues")
    File.mkdir_p!("/tmp/codebattle-issues")
    dir_path = Temp.mkdir!(basedir: "/tmp/codebattle-issues")
    response = HTTPoison.get!(@issues_link, %{}, follow_redirect: true, timeout: 10_000)
    file_name = Path.join(dir_path, "issues.tar.gz")
    File.write!(file_name, response.body)

    System.cmd("tar", ["-xzf", file_name, "--directory", dir_path])
    run(Path.join(dir_path, "issues"))
  end

  def run(path) do
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
      issue_info = YamlElixir.read_from_file!(Path.join(path, "#{issue_name}.yml"))

      asserts = File.read!(Path.join(path, "#{issue_name}.jsons"))
      signature = Map.get(issue_info, "signature")

      params = %{
        name: issue_name,
        disabled: Map.get(issue_info, "disabled"),
        description: Map.get(issue_info, "description"),
        level: Map.get(issue_info, "level"),
        input_signature: Map.get(signature, "input"),
        output_signature: Map.get(signature, "output"),
        asserts: asserts
      }

      case Codebattle.Task |> Codebattle.Repo.get_by(name: issue_name) do
        nil -> %Codebattle.Task{}
        task -> task
      end
      |> Codebattle.Task.changeset(params)
      |> Codebattle.Repo.insert_or_update()
    end)
  end
end
