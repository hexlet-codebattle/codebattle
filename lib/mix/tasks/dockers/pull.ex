defmodule Mix.Tasks.Dockers.Pull do
  @moduledoc false

  use Mix.Task

  @shortdoc "Pull dockers from docker hub"

  def run([slug]) do
    {:ok, _started} = Application.ensure_all_started(:codebattle)

    spec_filepath = Path.join(root, "priv/repo/seeds/langs.yml")
    %{langs: langs} = YamlElixir.read_from_file(spec_filepath, atoms: true)
    lang = Enum.find(langs, fn lang -> lang.slug == slug end)
    pull([lang])
  end

  def run(_) do
    root = File.cwd!()
    {:ok, _started} = Application.ensure_all_started(:codebattle)

    spec_filepath = Path.join(root, "priv/repo/seeds/langs.yml")
    %{langs: langs} = YamlElixir.read_from_file(spec_filepath, atoms: true)
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

  defp root do
    File.cwd!()
  end
end
