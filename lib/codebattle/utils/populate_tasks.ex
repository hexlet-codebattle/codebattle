defmodule Codebattle.Utils.PopulateTasks do
  @moduledoc false

  def from_dir!(dir) do
    dir
    |> File.ls!()
    |> Enum.each(&process_file(dir, &1))
  end

  defp process_file(dir, file) do
    dir
    |> Path.join(file)
    |> File.read!()
    |> Jason.decode!(keys: :atoms)
    |> Codebattle.Task.upsert!()
  end
end
