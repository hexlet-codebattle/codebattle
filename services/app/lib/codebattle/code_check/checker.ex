defmodule Codebattle.CodeCheck.Checker do
  @moduledoc false

  require Logger

  alias Codebattle.Generators.CheckerGenerator
  alias Codebattle.CodeCheck.CheckerStatus
  alias Codebattle.CodeCheck.CheckResult

  @docker_test_cmd_template "docker run --rm -m 400m --cpus=1 --net none -l codebattle_game ~s ~s timeout -s 9 10s make --silent test"
  @docker_compile_and_test_cmd_template "docker run -m 400m --cpus=1 --net none -l codebattle_game ~s ~s timeout -s 9 10s make --silent compile-and-test"

  def call(task, editor_text, lang) do
    # TODO: add hash to data.jsons or forbid read data.jsons
    {docker_command_template, docker_command_compile_template} =
      {dir_path, check_code} = prepare_tmp_dir!(task, editor_text, lang)

    volume = "-v #{dir_path}:/usr/src/app/#{lang.check_dir}"
    label_name = ""

    check_command =
      docker_command_template
      |> :io_lib.format([label_name, volume, lang.docker_image])
      |> to_string

    compile_check_command =
      docker_command_compile_template
      |> :io_lib.format([label_name, volume, lang.docker_image])
      |> to_string

    result =
      start_check_solution(
        {check_command, compile_check_command},
        %{task: task, lang: lang, check_code: check_code}
      )

    Task.start(File, :rm_rf, [dir_path])
    result
  end

  defp prepare_tmp_dir!(task, editor_text, lang) do
    File.mkdir_p!("/tmp/codebattle-check")
    dir_path = Temp.mkdir!(prefix: lang.slug, basedir: "/tmp/codebattle-check")

    check_code = :rand.normal() |> to_string
    hash_sum = "\"__code#{check_code}__\""

    file_name =
      case lang.slug do
        "haskell" ->
          "Solution.#{lang.extension}"

        "java" ->
          "Solution.#{lang.extension}"

        _ ->
          "solution.#{lang.extension}"
      end

    CheckerGenerator.create(lang, task, dir_path, check_code, hash_sum)

    File.write!(Path.join(dir_path, file_name), editor_text)
    {dir_path, check_code}
  end

  defp start_check_solution({check_command, compile_check_command}, meta) do
    container_output = run_checker(check_command, meta, "Execution")

    # for json returned langs need fix after all langs support json
    CheckerStatus.get_check_result(container_output, meta)
  end

  defp run_checker(command, %{task: _task, lang: lang}, description) do
    [cmd | cmd_opts] = command |> String.split()
    t = :os.system_time(:millisecond)
    {container_output, _status} = System.cmd(cmd, cmd_opts, stderr_to_stdout: true)
    Logger.error("#{description} time: #{:os.system_time(:millisecond) - t}, lang: #{lang.slug}")
    Logger.error(container_output)

    container_output
  end
end
