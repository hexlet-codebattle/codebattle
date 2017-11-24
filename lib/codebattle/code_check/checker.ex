defmodule Codebattle.CodeCheck.Checker do
  @moduledoc false
  @root_dir File.cwd!

  require Logger

  def check(task, editor_text) do
    dir_path = prepare_tmp_dir!(task, editor_text)

    # File.cd! dir_path

    check = System.cmd("make", ["run"], cd: dir_path, stderr_to_stdout: true, parallelism: true)
    {output, status} = check

    result = case status do
      0 ->
        {:ok, true}
      _ ->
        # TOD - insert only dockers STDERR here
        {:error, output}
    end

    Task.start(File, :rm_rf, [dir_path])
    result
  end

  defp prepare_tmp_dir!(task, editor_text) do
    # TOD need implement language selector for dockers

    tmp_path = @root_dir |> Path.join("tmp")
    dir_path = Temp.mkdir!(prefix: "battle", basedir: tmp_path)

    File.cp_r!(Path.join(@root_dir, "checkers/js/"), dir_path)

    File.write! Path.join(dir_path, "data.jsons"), task.asserts
    File.write! Path.join(dir_path, "solution"), editor_text

    dir_path
  end
end

