defmodule Codebattle.CodeCheck.CheckerV2 do
  @moduledoc false

  require Logger

  alias Codebattle.CodeCheck.OutputParserV2
  alias Codebattle.Generators.CheckerGeneratorV2

  @docker_lable "-l codebattle_game"
  @tmp_basedir "/tmp/codebattle-check"

  def call(task, editor_text, lang) do
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

    lang
    |> get_docker_command_template()
    |> :io_lib.format([@docker_lable, volume, lang.docker_image, ""])
    |> to_string
    |> String.split()
  end

  defp get_docker_command_template(lang) do
    case lang.base_image do
      :ubuntu -> Application.fetch_env!(:codebattle, :ubuntu_docker_command_template)
      :alpine -> Application.fetch_env!(:codebattle, :alpine_docker_command_template)
    end
  end
end
