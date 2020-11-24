defmodule Codebattle.CodeCheck.Checker do
  @moduledoc false

  require Logger

  alias Codebattle.Languages
  alias Codebattle.Generators.CheckerGenerator
  alias Codebattle.CodeCheck.CheckerStatus
  alias Codebattle.CodeCheck.CheckResult
  alias Codebattle.Utils.ContainerGameKiller

  @langs_needs_compiling ["golang", "cpp", "java", "kotlin", "csharp"]

  def call(task, editor_text, editor_lang) do
    case Languages.meta() |> Map.get(editor_lang) do
      nil ->
        %CheckResult{status: :error, result: "Lang #{editor_lang} is undefined", output: ""}

      lang ->
        # TODO: add hash to data.jsons or forbid read data.jsons
        {docker_command_template, docker_command_compile_template} =
          case lang.base_image do
            :ubuntu ->
              {
                Application.fetch_env!(:codebattle, :ubuntu_docker_command_template),
                Application.fetch_env!(:codebattle, :ubuntu_docker_command_compile_template)
              }

            :alpine ->
              {
                Application.fetch_env!(:codebattle, :alpine_docker_command_template),
                Application.fetch_env!(:codebattle, :alpine_docker_command_compile_template)
              }
          end

        {dir_path, check_code} = prepare_tmp_dir!(task, editor_text, lang)
        volume = "-v #{dir_path}:/usr/src/app/#{lang.check_dir}"
        label_name = "-l codebattle_game"

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

    CheckerGenerator.create(lang, task, dir_path, hash_sum)

    File.write!(Path.join(dir_path, file_name), editor_text)
    {dir_path, check_code}
  end

  defp start_check_solution({check_command, compile_check_command}, meta) do
    case compile_check_solution(compile_check_command, meta) do
      :ok ->
        container_output = run_checker(check_command, meta, "Execution")

        # for json returned langs need fix after all langs support json
        CheckerStatus.get_check_result(container_output, meta)

      {:error, result, output} ->
        %CheckResult{status: :error, result: result, output: output}
    end
  end

  defp compile_check_solution(command, %{lang: %{slug: slug} = lang} = meta)
       when slug in @langs_needs_compiling do
    container_output = run_checker(command, meta, "Compile check")
    CheckerStatus.get_compile_check_result(container_output, lang)
  end

  defp compile_check_solution(_, _), do: :ok

  defp run_checker(command, %{task: _task, lang: lang}, description) do
    [cmd | cmd_opts] = command |> String.split()
    t = :os.system_time(:millisecond)
    {container_output, _status} = System.cmd(cmd, cmd_opts, stderr_to_stdout: true)
    Logger.error("#{description} time: #{:os.system_time(:millisecond) - t}, lang: #{lang.slug}")

    container_output
  end
end
