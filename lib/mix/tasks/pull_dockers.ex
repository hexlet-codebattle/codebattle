defmodule Mix.Tasks.PullDockers do
  @moduledoc false

  use Mix.Task

  @shortdoc "Push dockers to cloud"

  def run(_) do
    root = File.cwd!
    {:ok, _started} = Application.ensure_all_started(:codebattle)
    spec_filepath = Path.join(root, "priv/repo/seeds/langs.yml")
    %{langs: langs} = YamlElixir.read_from_file spec_filepath, atoms: true
    for lang <- langs do
      {output, _status} = System.cmd("docker", ["pull", lang.docker_image], stderr_to_stdout: true)
      IO.puts "Pulling image for #{lang.slug}: #{output}"
    end
  end
end
