defmodule Codebattle.CodeCheck.OutputParserV2 do
  @moduledoc "Parse container output for representing check status of solution"

  require Logger
  alias Codebattle.CodeCheck.CheckResultV2
  alias Codebattle.Task

  def call(container_output, lang, task) do
    asserts = Task.get_asserts(task)

    try do
      container_output
      |> String.split("\n")
      |> filter_empty_items()
      |> Enum.map(&Jason.decode!/1)
      |> Enum.reduce(
        Codebattle.CodeCheck.CheckResultV2.new(),
        # TODO: calculate result here
        fn item, acc ->
          new_item = %CheckResultV2.AssertResult{
            arguments: item["output"]
          }
        end
      )
    rescue
      _ ->
        # TODO: add errors here
        Codebattle.CodeCheck.CheckResultV2.new()
    end
  end

  defp filter_empty_items(items), do: items |> Enum.filter(&(&1 != ""))
end
