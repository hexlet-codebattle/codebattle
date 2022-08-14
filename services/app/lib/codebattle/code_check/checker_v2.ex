defmodule Codebattle.CodeCheck.CheckerV2 do
  @moduledoc false

  require Logger

  alias Codebattle.CodeCheck.OutputParserV2
  alias Codebattle.Generators.CheckerGeneratorV2

  @tmp_basedir "/tmp/codebattle-check"
  @docker_run_cmd_template "docker run --rm -m 400m --cpus=1 --net none -l codebattle_game ~s timeout -s 9 10 make --silent test checker_name=~s"

  def(call(task, editor_text, lang)) do
    dir_path = prepare_tmp_dir!(task, editor_text, lang)
    [cmd | cmd_opts] = get_check_command(dir_path, lang)
    now = :os.system_time(:millisecond)
    {container_output, _status} = System.cmd(cmd, cmd_opts, stderr_to_stdout: true)
    Logger.error("Execution time: #{:os.system_time(:millisecond) - now}, lang: #{lang.slug}")
    Task.start(File, :rm_rf, [dir_path])

    container_output
    |> OutputParserV2.call(task)
  end

  defp prepare_tmp_dir!(task, editor_text, lang) do
    File.mkdir_p!(@tmp_basedir)
    dir_path = Temp.mkdir!(prefix: lang.slug, basedir: @tmp_basedir)

    solution_file_name = "solution.#{lang.extension}"
    checker_file_name = "checker.#{lang.extension}"
    checker_text = CheckerGeneratorV2.call(lang.slug, task)
    File.write!(Path.join(dir_path, checker_file_name), checker_text)
    File.write!(Path.join(dir_path, solution_file_name), editor_text)
    dir_path
  end

  defp get_check_command(dir_path, lang) do
    volume = "-v #{dir_path}:/usr/src/app/#{lang.check_dir}"

    @docker_run_cmd_template
    |> :io_lib.format([volume, lang.docker_image])
    |> to_string
    |> String.split()
  end
end
