defmodule Codebattle.CodeCheck.Checker do
  @moduledoc false

  require Logger
  alias Codebattle.{Repo, Language}

  def check(task, editor_text, lang_slug) do
    case Repo.get_by(Language, %{slug: lang_slug}) do
      nil ->
        {:error, "Lang #{lang_slug} is undefined"}

      lang ->
        # TODO: add hash to data.jsons or forbid read data.jsons
        docker_command_template = Application.fetch_env!(:codebattle, :docker_command_template)
        {dir_path, check_code} = prepare_tmp_dir!(task, editor_text, lang)
        volume = "-v #{dir_path}:/usr/src/app/check"

        command =
          docker_command_template
          |> :io_lib.format([volume, lang.docker_image])
          |> to_string

        Logger.debug(command)
        [cmd | cmd_opts] = command |> String.split()
        {global_output, status} = System.cmd(cmd, cmd_opts, stderr_to_stdout: true)

        Logger.debug(
          "Docker stdout for task_id: #{task.id}, lang: #{lang.slug}, output:#{global_output}"
        )

        clean_output = global_output |> String.split("\n") |> tl |> Enum.join("\n")

        result =
          case status do
            0 ->
              output_code = Regex.named_captures(~r/__code(?<code>.+)__/, clean_output)["code"]

              case output_code do
                ^check_code -> {:ok, true}
                _ -> {:error, clean_output}
              end

            _ ->
              {:error, clean_output}
          end

        Task.start(File, :rm_rf, [dir_path])
        result
    end
  end

  defp prepare_tmp_dir!(task, editor_text, lang) do
    dir_path = Temp.mkdir!(prefix: "codebattle-check")

    check_code = :rand.normal() |> to_string

    asserts = task.asserts <> "{\"check\":\"__code#{check_code}__\"}"
    File.write!(Path.join(dir_path, "data.jsons"), asserts)

    File.write!(Path.join(dir_path, "solution.#{lang.extension}"), editor_text)
    {dir_path, check_code}
  end
end
