defmodule Mix.Tasks.Issues.Fetch do
  @moduledoc false

  use Mix.Task
  @shortdoc "Fetch battle_asserts from github to ./tmp"

  @issues_dir Application.get_env(:codebattle, Mix.Tasks.Issues)[:issues_dir]

  def run(_) do
    case File.exists?(@issues_dir) do
      true ->
        File.cd!(@issues_dir)
        System.cmd("git", ["pull"])

      false ->
        System.cmd("git", [
          "clone",
          "https://github.com/hexlet-codebattle/battle_asserts.git",
          @issues_dir
        ])
    end
  end
end
