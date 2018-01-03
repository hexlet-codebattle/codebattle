defmodule Codebattle.CodeCheck.Checker do
  @moduledoc false
  @root_dir File.cwd!
  @lang_extentions  %{"js" => "js", "ruby" => "rb"}

  require Logger

  def check(task, editor_text, language) do
    case System.get_env("CODEBATTLE_CHECK_TRUE") do
      "true" -> {:ok, true}
      _ ->
        {dir_path, check_code} = prepare_tmp_dir!(task, editor_text, language)
        {global_output, status} = System.cmd("make", ["run"], cd: dir_path, stderr_to_stdout: true)
        Logger.info "Docker stdout for task_id: #{task.id}, lang: #{language}, output:#{global_output}"
        output = global_output |> String.split("\n") |> tl |> tl |> Enum.join("\n")
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

  defp prepare_tmp_dir!(task, editor_text, language) do
    dir_path = Temp.mkdir!(prefix: "battle")

    File.cp_r!(Path.join(@root_dir, "checkers/#{language}/"), dir_path)

    check_code = :rand.normal |> to_string

    asserts = task.asserts <> "{\"check\":\"#{check_code}\"}"
    File.write! Path.join(dir_path, "data.jsons"), asserts

    File.write! Path.join(dir_path, "solution.#{@lang_extentions[language]}"), editor_text
    {dir_path, check_code}
  end
end
