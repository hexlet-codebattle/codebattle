defmodule Mix.Tasks.Dockers.Pull do
  @moduledoc false

  require Logger
  use Mix.Task

  @shortdoc "Pull dockers from docker hub"

  def run([slug]) do
    langs = Codebattle.Languages.meta()
    lang = Enum.find(langs, fn {lang, _map} -> lang == slug end) |> elem(1)
    pull([lang])
  end

  def run(_) do
    langs = Codebattle.Languages.meta() |> Map.values()
    pull(langs)
  end

  defp pull(langs) do
    for lang <- langs do
      Logger.info("Start pulling image for #{lang.slug}")

      {output, _status} =
        System.cmd("docker", ["pull", lang.docker_image], stderr_to_stdout: true)

      Logger.info("End pulling image for #{lang.slug}: #{output}")
    end
  end
end
