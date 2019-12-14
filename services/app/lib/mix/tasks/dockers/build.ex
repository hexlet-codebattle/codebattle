defmodule Mix.Tasks.Dockers.Build do
  @moduledoc false

  use Mix.Task

  @shortdoc "Push dockers to cloud"

  def run([slug]) do
    {:ok, _started} = Application.ensure_all_started(:codebattle)

    langs = Codebattle.Languages.meta()
    lang = Enum.find(langs, fn {lang, _map} -> lang == slug end) |> elem(1)
    build([lang])
  end

  def run(_) do
    {:ok, _started} = Application.ensure_all_started(:codebattle)

    langs = Codebattle.Languages.meta()
    build(langs)
  end

  defp build(langs) do
    for lang <- langs do
      command =
        "docker build -t #{lang.docker_image} --file #{root()}/dockers/#{lang.slug}/Dockerfile #{
          root()
        }/dockers/#{lang.slug}/"

      [cmd | opts] = command |> String.split()
      IO.puts("Start building image for #{lang.slug}")
      {output, _status} = System.cmd(cmd, opts, stderr_to_stdout: true)
      IO.puts("End building image for #{lang.slug}: #{output}")
    end
  end

  defp root do
    File.cwd!()
  end
end
