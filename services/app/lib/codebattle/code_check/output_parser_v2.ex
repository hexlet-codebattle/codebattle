defmodule Codebattle.CodeCheck.OutputParserV2 do
  @moduledoc "Parse container output for representing check status of solution"

  require Logger
  alias Codebattle.CodeCheck.CheckResultV2
  alias Codebattle.Task

  @memory_overflow "Error 137"

  def call(container_output, task) do
    asserts = Task.get_asserts(task)

    try do
      outputs =
        container_output
        |> String.split("\n")
        |> filter_empty_items()
        |> Enum.map(&Jason.decode!/1)

      assert_result =
        outputs
        |> Enum.filter(fn x -> x["type"] in ["result", "error"] end)
        |> Enum.with_index()
        |> Enum.reduce(
          Codebattle.CodeCheck.CheckResultV2.new(),
          # TODO: calculate result on a single pass through list
          fn {item, index}, acc ->
            assert = Enum.at(asserts, index)

            new_item = %CheckResultV2.AssertResult{
              output: item["output"],
              time: item["time"],
              value: item["value"],
              type:
                if item["type"] == "result" and item["value"] == assert["expected"] do
                  "success"
                else
                  "failure"
                end,
              expected: assert["expected"],
              arguments: assert["arguments"]
            }

            Map.put(acc, :asserts, acc.asserts ++ [new_item])
          end
        )

      success_count = Enum.count(assert_result.asserts, fn x -> x.type == "success" end)
      asserts_count = Enum.count(asserts)

      status =
        if asserts_count == success_count do
          "success"
        else
          "failure"
        end

      output =
        Enum.find(outputs, fn x -> x["type"] == "output" end)
        |> case do
          nil -> nil
          x -> x["value"]
        end

      assert_result
      |> Map.put(:success_count, success_count)
      |> Map.put(:asserts_count, asserts_count)
      |> Map.put(:status, status)
      |> Map.put(:output, output)
    rescue
      e ->
        Logger.error(e)

        if String.contains?(container_output, @memory_overflow) do
          %CheckResultV2{
            output: "Your solution ran out of memory, please, rewrite it",
            status: :error
          }
        else
          %CheckResultV2{
            output: container_output,
            status: :error
          }
        end
    end
  end

  defp filter_empty_items(items), do: items |> Enum.filter(&(&1 != ""))
end
