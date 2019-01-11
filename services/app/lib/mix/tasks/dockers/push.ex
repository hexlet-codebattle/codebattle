defmodule Mix.Tasks.Dockers.Push do
  @moduledoc false

  use Mix.Task

  @shortdoc "Push dockers to docker hub"

  def run([slug]) do
    {:ok, _started} = Application.ensure_all_started(:codebattle)

    langs = Codebattle.Languages.meta()
    lang = Enum.find(langs, fn {lang, _map} -> lang == slug end) |> elem(1)
    push([lang])
  end

  def run(_) do
    {:ok, _started} = Application.ensure_all_started(:codebattle)

    langs = Codebattle.Languages.meta()
    push(langs)
  end

  defp push(langs) do
    for {_slug, lang} <- langs do
      IO.puts("Start pushing image for #{lang.slug}")

      {output, _status} =
        System.cmd("docker", ["push", lang.docker_image], stderr_to_stdout: true)

      IO.puts("End pushing image for #{lang.slug}: #{output}")
    end
  end
end
