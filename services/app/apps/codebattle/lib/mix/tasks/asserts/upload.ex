defmodule Mix.Tasks.Asserts.Upload do
  @moduledoc false

  use Mix.Task

  @shortdoc "Upload asserts from battle_asserts repo"

  def run(_) do
    {:ok, _started} = Application.ensure_all_started(:codebattle)
    Codebattle.TasksImporter.run_sync()
  end
end
