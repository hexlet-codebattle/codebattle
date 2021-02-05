defmodule Codebattle.Generators.CheckerGeneratorV2 do
  @moduledoc false

  require Logger

  def call(slug, task) do
    asserts =
      task.asserts
      |> String.split("\n")
      |> filter_empty_items()
      |> Enum.map(&Jason.decode!/1)
      |> Enum.map(fn x -> x["arguments"] end)
      |> Jason.encode!()

    source_dir = Application.app_dir(:codebattle, "priv/templates/")

    EEx.eval_file(Path.join(source_dir, "#{slug}.eex"), asserts: asserts)
  end

  defp filter_empty_items(items), do: items |> Enum.filter(&(&1 != ""))
end
