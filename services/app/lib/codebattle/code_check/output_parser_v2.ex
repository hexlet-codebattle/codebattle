defmodule Codebattle.CodeCheck.OutputParser.V2 do
  @moduledoc "Parse container output for representing check status of solution"

  require Logger
  alias Codebattle.CodeCheck.Result

  def call(checker_token) do
    %{raw_docker_output: raw_docker_output, exit_code: exit_code, task: task} = checker_token

    result_token = %{
      check_result: nil,
      solution_results: [],
      raw_docker_output: raw_docker_output,
      exit_code: exit_code,
      task: task
    }

    result_token
    |> parse_output()
    |> compare_results_with_asserts()
    |> calculate_result_metrics()
    |> Map.get(:check_result)
  end

  defp parse_output(%{exit_code: 0} = token) do
    %{raw_docker_output: raw_docker_output} = token

    solution_results =
      raw_docker_output
      |> String.split("\n")
      |> Enum.map(fn str ->
        try do
          Jason.decode!(String.trim(str))
        rescue
          _ ->
            nil
        end
      end)
      |> Enum.filter(&Function.identity/1)

    %{token | solution_results: solution_results}
  end

  defp parse_output(token) do
    %{raw_docker_output: raw_docker_output, exit_code: exit_code} = token

    output_error =
      cond do
        exit_code == 2 and String.contains?(raw_docker_output, "Killed") ->
          "Your solution ran out of memory, please, rewrite it"

        exit_code == 143 and String.contains?(raw_docker_output, "SIGTERM") ->
          "Your solution was executed for longer than 15 seconds, try to write more optimally"

        true ->
          "Something went wrong! Please, write to dev team in our Slack \n UNKNOWN_ERROR: #{raw_docker_output}}"
      end

    %{
      token
      | check_result: %Result.V2{
          exit_code: exit_code,
          output_error: output_error,
          status: "error"
        }
    }
  end

  defp compare_results_with_asserts(%{check_result: %{status: "error"}} = token), do: token

  defp compare_results_with_asserts(%{solution_results: [%{"type" => "error"} = item]} = token) do
    # {"time":0,"type":"error","value":"undefined function sdf/0 (there is no such import)"}
    check_result = %Result.V2{
      output_error: item["value"],
      exit_code: token.exit_code,
      status: "error"
    }

    %{token | check_result: check_result}
  end

  defp compare_results_with_asserts(token) do
    output_error =
      token.solution_results
      |> Enum.find(fn item -> item["type"] == "output" end)
      |> case do
        nil -> ""
        output_item -> Map.get(output_item, "output")
      end

    check_result =
      token.solution_results
      |> Enum.filter(fn item -> item["type"] != "output" end)
      |> Enum.zip(token.task.asserts)
      |> Enum.reduce(
        %Result.V2{output_error: output_error},
        fn {solution_result, assert_item}, acc ->
          assert_result = %Result.V2.AssertResult{
            output: solution_result["output"],
            execution_time: solution_result["time"],
            result: solution_result["value"],
            status:
              if solution_result["type"] == "result" and
                   AtomizedMap.atomize(solution_result["value"]) == assert_item.expected do
                "success"
              else
                "failure"
              end,
            expected: assert_item.expected,
            arguments: assert_item.arguments
          }

          Map.put(acc, :asserts, acc.asserts ++ [assert_result])
        end
      )

    %{token | check_result: check_result}
  end

  defp calculate_result_metrics(%{check_result: %{status: "error"}} = token), do: token

  defp calculate_result_metrics(token) do
    success_asserts = Enum.filter(token.check_result.asserts, fn x -> x.status == "success" end)
    failure_asserts = Enum.filter(token.check_result.asserts, fn x -> x.status == "failure" end)

    success_count = Enum.count(success_asserts)
    asserts_count = Enum.count(token.task.asserts)

    status =
      if asserts_count == success_count,
        do: "ok",
        else: "failure"

    %{
      token
      | check_result: %Result.V2{
          token.check_result
          | asserts: failure_asserts ++ success_asserts,
            success_count: success_count,
            asserts_count: asserts_count,
            status: status
        }
    }
  end
end
