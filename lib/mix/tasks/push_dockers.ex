defmodule Mix.Tasks.PushDockers do
  @moduledoc false

  use Mix.Task

  @shortdoc "Push dockers to cloud"

  def run(_) do
    root = File.cwd!
    {:ok, _started} = Application.ensure_all_started(:codebattle)
    spec_filepath = Path.join(root, "priv/repo/seeds/langs.yml")
    %{langs: langs} = YamlElixir.read_from_file spec_filepath, atoms: true
    for lang <- langs do
      command = "docker build -t #{lang.docker_image} --file #{root}/dockers/#{lang.slug}/Dockerfile #{root}/dockers/#{lang.slug}/"
      [cmd | opts] = command |> String.split
      {output, _status} = System.cmd(cmd, opts, stderr_to_stdout: true)
      IO.puts "Building image for #{lang.slug}: #{output}"
      {output, _status} = System.cmd("docker", ["push", lang.docker_image], stderr_to_stdout: true)
      IO.puts "Pushing image for #{lang.slug}: #{output}"
    end
  end
end
