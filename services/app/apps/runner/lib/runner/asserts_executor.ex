defmodule Runner.AssertsExecutor do
  @moduledoc false

  require Logger

  alias Runner.AssertsGenerator

  @tmp_basedir "/tmp/codebattle-runner"
  @docker_cmd_template "docker run --rm --init --memory 500m --cpus=1 --net none -l codebattle_game ~s ~s timeout -s KILL 30s make --silent generate_asserts"
  @fake_docker_run Application.compile_env(:runner, :fake_docker_run, false)

  @spec call(Runner.Task.t(), Runner.LanguageMeta.t(), String.t(), String.t()) ::
          Runner.generate_arguments()
  def call(task, lang_meta, solution_text, arguments_generator_text) do
    seed = get_seed()

    runner_text = AssertsGenerator.call(task, lang_meta)

    tmp_dir_path =
      prepare_tmp_dir!(lang_meta, solution_text, arguments_generator_text, runner_text)

    {output, exit_code} =
      lang_meta
      |> get_docker_command(tmp_dir_path)
      |> run_command()

    Task.start(File, :rm_rf, [tmp_dir_path])

    %{container_output: output, exit_code: exit_code, seed: seed}
  end

  defp prepare_tmp_dir!(
         lang_meta,
         solution_text,
         arguments_generator_text,
         runner_text
       ) do
    File.mkdir_p!(@tmp_basedir)
    tmp_dir_path = Temp.mkdir!(%{prefix: lang_meta.slug, basedir: @tmp_basedir})

    Logger.debug("Solution text: #{inspect(solution_text)}")
    Logger.debug("Arguments generator text: #{inspect(arguments_generator_text)}")
    Logger.debug("Asserts generator runner text: #{inspect(runner_text)}")

    Logger.debug("solution_file_name: #{inspect(lang_meta.solution_file_name)}")

    Logger.debug(
      "arguments_generator_file_name: #{inspect(lang_meta.arguments_generator_file_name)}"
    )

    Logger.debug("asserts_generator_file_name: #{inspect(lang_meta.asserts_generator_file_name)}")

    Logger.debug("tmp_dir_path: #{inspect(tmp_dir_path)}")

    File.write!(Path.join(tmp_dir_path, lang_meta.solution_file_name), solution_text)

    File.write!(
      Path.join(tmp_dir_path, lang_meta.arguments_generator_file_name),
      arguments_generator_text
    )

    File.write!(Path.join(tmp_dir_path, lang_meta.asserts_generator_file_name), runner_text)

    tmp_dir_path
  end

  defp get_docker_command(lang_meta, tmp_dir_path) do
    volume = "-v #{tmp_dir_path}:/usr/src/app/#{lang_meta.generator_dir}"

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
