defmodule Runner.Executor do
  @moduledoc false

  require Logger

  alias Runner.CheckerGenerator

  @tmp_basedir "/tmp/codebattle-runner"
  @docker_cmd_template "docker run --rm --init --memory 500m --cpus=1 --net none -l codebattle_game ~s ~s timeout -s 15 15s make --silent test"
  @fake_docker_run Application.compile_env(:runner, :fake_docker_run, false)

  @spec call(Runner.Task.t(), Runner.LanguageMeta.t(), String.t()) :: Runner.execution_result()
  def call(task, lang_meta, solution_text) do
    seed = get_seed()
    checker_text = CheckerGenerator.call(task, lang_meta, seed)

    tmp_dir_path = prepare_tmp_dir!(lang_meta, solution_text, checker_text)

    {output, exit_code} =
      lang_meta
      |> get_docker_command(tmp_dir_path)
      |> run_command()

    Task.start(File, :rm_rf, [tmp_dir_path])

    %{container_output: output, exit_code: exit_code, seed: seed}
  end

  defp prepare_tmp_dir!(lang_meta, solution_text, checker_text) do
    File.mkdir_p!(@tmp_basedir)
    tmp_dir_path = Temp.mkdir!(%{prefix: lang_meta.slug, basedir: @tmp_basedir})

    Logger.info("Solution text: #{inspect(solution_text)}")
    Logger.info("Checker text: #{inspect(checker_text)}")
    Logger.info("solution_file_name: #{inspect(lang_meta.solution_file_name)}")
    Logger.info("checker_file_name: #{inspect(lang_meta.checker_file_name)}")
    Logger.info("tmp_dir_path: #{inspect(tmp_dir_path)}")

    File.write!(Path.join(tmp_dir_path, lang_meta.solution_file_name), solution_text)
    File.write!(Path.join(tmp_dir_path, lang_meta.checker_file_name), checker_text)

    tmp_dir_path
  end

  defp get_docker_command(lang_meta, tmp_dir_path) do
    volume = "-v #{tmp_dir_path}:/usr/src/app/#{lang_meta.check_dir}"

    Logger.info("Docker volume: #{inspect(volume)}")

    @docker_cmd_template
    |> :io_lib.format([volume, lang_meta.docker_image])
    |> to_string
    |> String.split()
  end

  defp run_command([cmd | cmd_opts]) do
    if @fake_docker_run do
      {"oi", 0}
    else
      Logger.info("Start docker execution: #{inspect(cmd_opts)}")
      System.cmd(cmd, cmd_opts, stderr_to_stdout: true)
    end
  end

  defp get_seed do
    if @fake_docker_run do
      "blz"
    else
      to_string(:rand.uniform(10_000_000))
    end
  end
end
