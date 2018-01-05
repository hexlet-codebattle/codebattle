defmodule Codebattle.CodeCheck.Checker do
  alias Codebattle.{Repo, Language}

  @moduledoc false
  @root_dir File.cwd!

  require Logger

  def check(task, editor_text, lang_slug) do
    case Repo.get_by(Language, %{slug: lang_slug}) do
      nil -> {:error, "Lang #{lang_slug} is undefined"}
      lang ->
        # TODO: add hash to data.jsons or forbid read data.jsons
        docker_command_template = Application.fetch_env!(:codebattle, :docker_command_template)
        {dir_path, check_code} = prepare_tmp_dir!(task, editor_text, lang)
        volume = "-v #{dir_path}:/usr/src/app"
        command = docker_command_template
                  |> :io_lib.format([volume, lang.docker_image])
                  |> to_string
        Logger.debug command
        [cmd | cmd_opts] = command |> String.split
        {global_output, status} = System.cmd(cmd, cmd_opts, stderr_to_stdout: true)
        Logger.debug "Docker stdout for task_id: #{task.id}, lang: #{lang.slug}, output:#{global_output}"
        output = global_output |> String.split("\n") |> tl |> Enum.join("\n")
        result = case  {output, status} do
          {^check_code, 0} ->
            {:ok, true}
          _ ->
            {:error, output}
        end
        Task.start(File, :rm_rf, [dir_path])
        result
    end
  end

  defp prepare_tmp_dir!(task, editor_text, lang) do
    dir_path = Temp.mkdir!(prefix: "codebattle-check")

    File.cp_r!(Path.join(@root_dir, "checkers/#{lang.slug}/"), dir_path)

    check_code = :rand.normal |> to_string

    asserts = task.asserts <> "{\"check\":\"#{check_code}\"}"
    File.write! Path.join(dir_path, "data.jsons"), asserts

    File.write! Path.join(dir_path, "solution.#{lang.extension}"), editor_text
    {dir_path, check_code}
  end
end
