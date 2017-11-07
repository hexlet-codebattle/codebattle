defmodule Mix.Tasks.Issues.Generate do
  @moduledoc false

  use Mix.Task
  @shortdoc "Generate jsons and yamls from /tmp/battle_asserts"

  @issues_dir Application.get_env(:codebattle, Mix.Tasks.Issues)[:issues_dir]

  def run(_) do
    File.cd! @issues_dir
    System.cmd("make", ["generate-from-docker"])
  end
end
