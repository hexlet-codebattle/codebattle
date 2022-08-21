defmodule Codebattle.CodeCheck.OutputParser.V2 do
  @moduledoc "Parse container output for representing check status of solution"

  require Logger
  alias Codebattle.CodeCheck.Result

  @memory_overflow "Error 137"

  def call(token) do
    %{raw_docker_output: raw_docker_output, task: task} = token
    IO.puts(111_111_111)
    IO.puts(raw_docker_output)

    outputs =
      raw_docker_output
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

    output_error =
      if is_nil(outputs["messages"]) do
        nil
      else
        outputs["messages"]
        |> Enum.map(& &1["value"])
        |> Enum.join("/n")
      end

    cond do
      String.contains?(raw_docker_output, @memory_overflow) ->
        %Result.V2{
          output_error: "Your solution ran out of memory, please, rewrite it",
          status: "error"
        }

      valid_assert_results(outputs["results"], task.asserts) ->
        assert_result =
          outputs["results"]
          |> Enum.with_index()
          |> Enum.reduce(
            %Result.V2{},
            fn {item, index}, acc ->
              assert = Enum.at(task.asserts, index)

              new_item = %Result.V2.AssertResult{
                output: item["output"],
                execution_time: item["time"],
                result: item["value"],
                status:
                  if item["type"] == "result" and item["value"] == assert.expected do
                    "success"
                  else
                    "failure"
                  end,
                expected: assert.expected,
                arguments: assert.arguments
              }

              Map.put(acc, :asserts, acc.asserts ++ [new_item])
            end
          )

        success_asserts = Enum.filter(assert_result.asserts, fn x -> x.status == "success" end)
        failure_asserts = Enum.filter(assert_result.asserts, fn x -> x.status == "failure" end)

        success_count = Enum.count(success_asserts)
        asserts_count = Enum.count(task.asserts)

        status =
          if asserts_count == success_count do
            "ok"
          else
            "failure"
          end

        %{
          assert_result
          | asserts: failure_asserts ++ success_asserts,
            success_count: success_count,
            asserts_count: asserts_count,
            status: status,
            output_error: output_error
        }

      true ->
        %Result.V2{
          output_error: raw_docker_output,
          status: "error"
        }
    end
  end

  defp filter_empty_items(items), do: items |> Enum.filter(&(&1 != ""))

  defp valid_assert_results(nil, _), do: false

  defp valid_assert_results(results, asserts), do: Enum.count(results) == Enum.count(asserts)
end
