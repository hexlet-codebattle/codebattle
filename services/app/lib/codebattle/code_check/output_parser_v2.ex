defmodule Codebattle.CodeCheck.OutputParserV2 do
  @moduledoc "Parse container output for representing check status of solution"

  require Logger
  alias Codebattle.CodeCheck.CheckResult
  @memory_overflow "Error 137"

  def call(container_output, lang, task) do
    try do
      container_output
      |> IO.inspect()
      |> String.split("\n")
      |> filter_empty_items()
      |> Enum.map(&Jason.decode!/1)
      |> IO.inspect()
      |> Enum.reduce(
        Codebattle.CodeCheck.CheckResultV2.new(),
        # TODO: calculate result here
        fn item, acc ->
          acc
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
