defmodule Mix.Tasks.Dockers.Push do
  @moduledoc false

  use Mix.Task

  @shortdoc "Push dockers to docker hub"

  def run([slug]) do
    {:ok, _started} = Application.ensure_all_started(:codebattle)

    spec_filepath = Path.join(root, "priv/repo/seeds/langs.yml")
    %{langs: langs} = YamlElixir.read_from_file(spec_filepath, atoms: true)
    lang = Enum.find(langs, fn lang -> lang.slug == slug end)
    push([lang])
  end

  def run(_) do
    root = File.cwd!()
    {:ok, _started} = Application.ensure_all_started(:codebattle)

    spec_filepath = Path.join(root, "priv/repo/seeds/langs.yml")
    %{langs: langs} = YamlElixir.read_from_file(spec_filepath, atoms: true)
    push(langs)
  end

  defp push(langs) do
    for lang <- langs do
      IO.puts("Start pushing image for #{lang.slug}")

      {output, _status} =
        System.cmd("docker", ["push", lang.docker_image], stderr_to_stdout: true)

      IO.puts("End pushing image for #{lang.slug}: #{output}")
    end
  end

  defp root do
    File.cwd!()
  end
end
