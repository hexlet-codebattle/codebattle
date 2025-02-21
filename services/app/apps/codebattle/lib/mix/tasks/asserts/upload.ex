defmodule Mix.Tasks.Asserts.Upload do
  @shortdoc "Upload asserts from battle_asserts repo"

  @moduledoc false

  use Mix.Task

  def run(_) do
    {:ok, _started} = Application.ensure_all_started(:codebattle)
    Codebattle.TasksImporter.run_sync()
  end
end
