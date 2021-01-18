defmodule Codebattle.CodeCheck.OutputParserV2 do
  @moduledoc "Parse container output for representing check status of solution"

  require Logger
  alias Codebattle.CodeCheck.CheckResultV2
  alias Codebattle.Task

  def call(container_output, lang, task) do
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
          # TODO: calculate result here
          fn {item, index}, acc ->
            assert = Enum.at(asserts, index)

            new_item = %CheckResultV2.AssertResult{
              value: item["value"] == assert["expected"],
              output: item["output"],
              time: item["time"],
              received: item["value"],
              type: item["type"],
              expected: assert["expected"],
              arguments: assert["arguments"]
            }

            Map.put(acc, :asserts, acc.asserts ++ [new_item])
          end
        )

      success_count = Enum.count(assert_result.asserts, fn x -> x.value end)
      asserts_count = Enum.count(asserts)

      status =
        if asserts_count == success_count do
          :success
        else
          :failure
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

        %CheckResultV2{
          output: container_output,
          status: :error
        }
    end
  end

  defp filter_empty_items(items), do: items |> Enum.filter(&(&1 != ""))
end
