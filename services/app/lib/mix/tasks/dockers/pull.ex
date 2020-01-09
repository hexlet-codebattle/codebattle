defmodule Mix.Tasks.Dockers.Pull do
  @moduledoc false

  use Mix.Task

  @shortdoc "Pull dockers from docker hub"

  def run([slug]) do
    {:ok, _started} = Application.ensure_all_started(:codebattle)

    langs = Codebattle.Languages.meta()
    lang = Enum.find(langs, fn {lang, _map} -> lang == slug end) |> elem(1)
    pull([lang])
  end

  def run(_) do
    {:ok, _started} = Application.ensure_all_started(:codebattle)

    langs = Codebattle.Languages.meta() |> Map.values()
    pull(langs)
  end

  defp pull(langs) do
    for lang <- langs do
      IO.puts("Start pulling image for #{lang.slug}")

      {output, _status} =
        System.cmd("docker", ["pull", lang.docker_image], stderr_to_stdout: true)

      IO.puts("End pulling image for #{lang.slug}: #{output}")
    end
  end

  # defp root do
  #   File.cwd!()
  # end
end
