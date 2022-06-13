defmodule Codebattle.CodeCheck.OutputParserV2 do
  @moduledoc "Parse container output for representing check status of solution"

  require Logger
  alias Codebattle.CodeCheck.CheckResultV2
  alias Codebattle.Task

  @memory_overflow "Error 137"

  def call(container_output, task) do
    asserts = Task.get_asserts(task)

    outputs =
      container_output
      |> String.split("\n")
      |> filter_empty_items()
      |> Enum.map(fn str ->
        try do
          Jason.decode!(str)
        rescue
          _ ->
            %{
              "type" => "output",
              "time" => 0,
              "value" => str,
              "output" => str
            }
        end
      end)
      |> Enum.group_by(fn x ->
        if x["type"] in ["result", "error"] do
          "results"
        else
          "messages"
        end
      end)

    output =
      if is_nil(outputs["messages"]) do
        nil
      else
        outputs["messages"]
        |> Enum.map_join("/n", & &1["value"])
      end

    cond do
      String.contains?(container_output, @memory_overflow) ->
        %CheckResultV2{
          output: "Your solution ran out of memory, please, rewrite it",
          status: :error
        }

      valid_assert_results(outputs["results"], asserts) ->
        assert_result =
          outputs["results"]
          |> Enum.with_index()
          |> Enum.reduce(
            CheckResultV2.new(),
            # TODO: calculate result on a single pass through list
            fn {item, index}, acc ->
              assert = Enum.at(asserts, index)

              new_item = %CheckResultV2.AssertResult{
                output: item["output"],
                execution_time: item["time"],
                result: item["value"],
                status:
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

        success_asserts = Enum.filter(assert_result.asserts, fn x -> x.status == "success" end)
        failure_asserts = Enum.filter(assert_result.asserts, fn x -> x.status == "failure" end)

        success_count = Enum.count(success_asserts)
        asserts_count = Enum.count(asserts)

        status =
          if asserts_count == success_count do
            :ok
          else
            :failure
          end

        assert_result
        |> Map.put(:asserts, failure_asserts ++ success_asserts)
        |> Map.put(:success_count, success_count)
        |> Map.put(:asserts_count, asserts_count)
        |> Map.put(:status, status)
        |> Map.put(:output, output)

      true ->
        %CheckResultV2{
          output: container_output,
          status: :error
        }
    end
  end

  defp filter_empty_items(items), do: items |> Enum.filter(&(&1 != ""))

  defp valid_assert_results(nil, _), do: false

  defp valid_assert_results(results, asserts), do: Enum.count(results) == Enum.count(asserts)
end
