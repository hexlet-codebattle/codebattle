defmodule Runner.Executor do
  @moduledoc false

  alias Runner.CheckerGenerator
  alias Runner.Languages

  require Logger

  @tmp_basedir "/tmp/codebattle-runner"
  @docker_cmd_template "docker run --rm --init --memory 500m --cpus=1 --net none -l codebattle_game ~s ~s timeout -s 15 15s make --silent test"

  @spec call(Runner.Task, Languages.meta(), String.t()) :: Runner.execution_result()
  def call(task, lang_meta, solution_text) do
    seed = to_string(:rand.uniform(10_000_000))
    checker_text = CheckerGenerator.call(task, lang_meta, seed)

    tmp_dir_path = prepare_tmp_dir!(lang_meta, solution_text, checker_text)
    [cmd | cmd_opts] = get_docker_command(lang_meta, tmp_dir_path)

    {output, exit_code} = System.cmd(cmd, cmd_opts, stderr_to_stdout: true)

    Task.start(File, :rm_rf, [tmp_dir_path])

    %{container_output: output, exit_code: exit_code, seed: seed}
  end

  defp prepare_tmp_dir!(lang_meta, solution_text, checker_text) do
    File.mkdir_p!(@tmp_basedir)
    tmp_dir_path = Temp.mkdir!(%{prefix: lang_meta.slug, basedir: @tmp_basedir})

    File.write!(Path.join(tmp_dir_path, lang_meta.solution_file_name), solution_text)
    File.write!(Path.join(tmp_dir_path, lang_meta.checker_file_name), checker_text)

    tmp_dir_path
  end

  defp get_docker_command(lang_meta, tmp_dir_path) do
    volume = "-v #{tmp_dir_path}:/usr/src/app/#{lang_meta.check_dir}"

    @docker_cmd_template
    |> :io_lib.format([volume, lang_meta.docker_image])
    |> to_string
    |> String.split()
  end
end
