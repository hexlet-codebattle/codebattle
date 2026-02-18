defmodule Runner.Executor do
  @moduledoc false

  alias Runner.CheckerGenerator

  require Logger

  defp tmp_basedir do
    System.get_env("CODEBATTLE_RUNNER_TMP") ||
      case System.get_env("XDG_CACHE_HOME") do
        nil -> Path.join([System.user_home!(), ".cache", "codebattle-runner"])
        xdg -> Path.join([xdg, "codebattle-runner"])
      end
  end

  # optional flags via env
  defp platform_arg do
    case System.get_env("RUNNER_PLATFORM", "") do
      "" -> ""
      p -> "--platform " <> p
    end
  end

  defp volume_label_suffix, do: System.get_env("RUNNER_VOLUME_LABEL", "")

  @container_cmd_template "podman run --rm --init --entrypoint= --memory 600m --cpus=2 --net none -l codebattle_game ~s ~s timeout -s KILL ~s make --silent test"
  @fake_container_run Application.compile_env(:runner, :fake_container_run, false)

  @spec call(Runner.Task.t(), Runner.LanguageMeta.t(), String.t(), String.t()) ::
          Runner.execution_result()
  def call(%Runner.Task{type: "sql"}, lang_meta, solution_text, _run_id) do
    seed = get_seed()

    tmp_dir_path = prepare_tmp_dir!(lang_meta, solution_text, "", "")

    {out, err, status} =
      lang_meta
      |> get_container_command(tmp_dir_path)
      |> run_command(lang_meta)

    Task.start(File, :rm_rf, [tmp_dir_path])

    %{
      container_output: out,
      container_stderr: err,
      exit_code: status,
      seed: seed
    }
  end

  def call(task, lang_meta, solution_text, _run_id) do
    seed = get_seed()

    checker_text =
      if lang_meta.generate_checker? do
        CheckerGenerator.call(task, lang_meta, seed)
      end

    asserts_text =
      Jason.encode!(%{
        arguments: Enum.map(task.asserts, & &1.arguments),
        input_signature: Enum.map(task.input_signature, & &1.type),
        output_signature: task.output_signature.type
      })

    tmp_dir_path = prepare_tmp_dir!(lang_meta, solution_text, checker_text, asserts_text)

    {out, err, status} =
      lang_meta
      |> get_container_command(tmp_dir_path)
      |> run_command(lang_meta)

    Task.start(File, :rm_rf, [tmp_dir_path])

    %{
      container_output: out,
      container_stderr: err,
      exit_code: status,
      seed: seed
    }
  end

  defp prepare_tmp_dir!(lang_meta, solution_text, checker_text, asserts_text) do
    base = tmp_basedir()
    File.mkdir_p!(base)
    tmp_dir_path = Temp.mkdir!(%{prefix: lang_meta.slug, basedir: base})

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

  defp get_container_command(lang_meta, tmp_dir_path) do
    plat = platform_arg()
    vol_suffix = volume_label_suffix()
    mount = "-v #{tmp_dir_path}:/usr/src/app/#{lang_meta.check_dir}#{vol_suffix}"

    first_slot =
      [plat, mount]
      |> Enum.reject(&(&1 == ""))
      |> Enum.join(" ")

    Logger.info("Container volume: #{inspect(mount)}")
    if plat != "", do: Logger.info("Container platform: #{plat}")

    @container_cmd_template
    |> :io_lib.format([first_slot, lang_meta.image, lang_meta.container_run_timeout])
    |> to_string()
    |> String.split()
  end

  defp run_command([cmd | cmd_opts], lang_meta) do
    if @fake_container_run do
      {"oi", "blz", 0}
    else
      hostname = System.get_env("HOSTNAME", "unknown")
      Logger.info("Start container execution: #{cmd} #{inspect(cmd_opts)}")

      {execution_time, {output, status}} =
        :timer.tc(fn ->
          System.cmd(cmd, cmd_opts, stderr_to_stdout: true)
        end)

      Logger.debug("Output: #{inspect(output)}")

      Logger.error("#{hostname} execution lang: #{lang_meta.slug}, time: #{div(execution_time, 1_000)} msecs")

      {output, "", status}
    end
  end

  defp get_seed do
    if @fake_container_run, do: "blz", else: to_string(:rand.uniform(10_000_000))
  end
end
