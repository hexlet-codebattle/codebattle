defmodule Runner.Executor do
  @moduledoc false

  require Logger

  alias Runner.CheckerGenerator
  alias Runner.Languages

  @tmp_basedir "/tmp/codebattle-runner"
  @docker_cmd_template "docker run --rm --init --memory 2400m --cpus=2 --net none -l codebattle_game ~s ~s timeout -s KILL ~s make --silent test"
  @fake_docker_run Application.compile_env(:runner, :fake_docker_run, false)

  @spec call(Runner.Task.t(), Runner.LanguageMeta.t(), String.t(), String.t()) ::
          Runner.execution_result()
  def call(task, lang_meta, solution_text, run_id) do
    seed = get_seed()

    wait_permission_to_launch(run_id, 0, Languages.get_timeout_ms(lang_meta) + 500)

    checker_text =
      if lang_meta.generate_checker? do
        CheckerGenerator.call(task, lang_meta, seed)
      else
        nil
      end

    asserts_text =
      Jason.encode!(%{
        arguments: Enum.map(task.asserts, & &1.arguments),
        input_signature: Enum.map(task.input_signature, & &1.type),
        output_signature: task.output_signature.type
      })

    tmp_dir_path = prepare_tmp_dir!(lang_meta, solution_text, checker_text, asserts_text)

    {output, exit_code} =
      lang_meta
      |> get_docker_command(tmp_dir_path)
      |> run_command(lang_meta)

    Task.start(File, :rm_rf, [tmp_dir_path])

    %{container_output: output, exit_code: exit_code, seed: seed}
  end

  defp wait_permission_to_launch(nil, _waiting_time_ms, _max_timeout_ms) do
    :ok
  end

  defp wait_permission_to_launch(run_id, waiting_time_ms, max_timeout_ms)
       when waiting_time_ms >= max_timeout_ms do
    Runner.StateContainersRunLimiter.unregistry_container(run_id)
    throw(:error)
  end

  defp wait_permission_to_launch(run_id, waiting_time_ms, max_timeout_ms) do
    case Runner.StateContainersRunLimiter.check_run_status(run_id) do
      {:ok, {:wait, wait_timeout_ms}} ->
        :timer.sleep(wait_timeout_ms)
        wait_permission_to_launch(run_id, wait_timeout_ms + waiting_time_ms, max_timeout_ms)

      _ ->
        :ok
    end
  end

  defp prepare_tmp_dir!(lang_meta, solution_text, checker_text, asserts_text) do
    File.mkdir_p!(@tmp_basedir)
    tmp_dir_path = Temp.mkdir!(%{prefix: lang_meta.slug, basedir: @tmp_basedir})

    Logger.debug("Solution text: #{inspect(solution_text)}")
    Logger.debug("Checker text: #{inspect(checker_text)}")
    Logger.debug("solution_file_name: #{inspect(lang_meta.solution_file_name)}")
    Logger.debug("checker_file_name: #{inspect(lang_meta.checker_file_name)}")
    Logger.debug("tmp_dir_path: #{inspect(tmp_dir_path)}")

    File.write!(Path.join(tmp_dir_path, lang_meta.solution_file_name), solution_text)

    if checker_text do
      File.write!(Path.join(tmp_dir_path, lang_meta.checker_file_name), checker_text)
    end

    File.write!(Path.join(tmp_dir_path, "asserts.json"), asserts_text)

    tmp_dir_path
  end

  defp get_docker_command(lang_meta, tmp_dir_path) do
    volume = "-v #{tmp_dir_path}:/usr/src/app/#{lang_meta.check_dir}"

    Logger.info("Docker volume: #{inspect(volume)}")

    @docker_cmd_template
    |> :io_lib.format([volume, lang_meta.docker_image, lang_meta.container_run_timeout])
    |> to_string
    |> String.split()
  end

  defp run_command([cmd | cmd_opts], lang_meta) do
    if @fake_docker_run do
      {"oi", 0}
    else
      hostname = System.get_env("HOSTNAME", "unknown")
      Logger.info("Start docker execution: #{inspect(cmd_opts)}")

      {execution_time, result} =
        :timer.tc(fn -> System.cmd(cmd, cmd_opts, stderr_to_stdout: true) end)

      Logger.error(
        "#{hostname} execution lang: #{lang_meta.slug}, time: #{div(execution_time, 1_000)} msecs"
      )

      result
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
