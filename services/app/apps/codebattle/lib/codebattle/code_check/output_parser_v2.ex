defmodule Codebattle.CodeCheck.OutputParser.V2 do
  @moduledoc "Parse container output for representing check status of solution"

  alias Codebattle.CodeCheck.Result
  alias Runner.AtomizedMap

  def call(%{execution_error: :timeout}) do
    %Result.V2{status: "service_timeout"}
  end

  def call(%{execution_error: error}) when not is_nil(error) do
    %Result.V2{
      status: "service_failure",
      output_error: inspect(error)
    }
  end

  def call(checker_token) do
    result_token = %{
      check_result: nil,
      solution_results: [],
      container_output: checker_token.container_output,
      container_stderr: checker_token.container_stderr,
      exit_code: checker_token.exit_code,
      task: checker_token.task
    }

    result_token
    |> parse_output()
    |> compare_results_with_asserts()
    |> calculate_result_metrics()
    |> Map.get(:check_result)
  end

  defp parse_output(%{exit_code: 0} = token) do
    solution_results =
      token.container_output
      |> String.replace(~r/WARNING:.+\n/, "")
      |> Jason.decode!()
      |> List.wrap()

    %{token | solution_results: solution_results}
  rescue
    _e ->
      solution_results =
        token.container_output
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
        |> case do
          [] ->
            [
              %{
                "type" => "output",
                "value" => inspect(token.container_output) <> inspect(token.container_stderr)
              }
            ]

          values ->
            List.wrap(values)
        end

      %{token | solution_results: solution_results}
  end

  defp parse_output(token) do
    %{
      container_output: container_output,
      container_stderr: container_stderr,
      exit_code: exit_code
    } = token

    output_error =
      cond do
        exit_code == 2 and
            (String.contains?(container_output, "Killed") or
               String.contains?(container_stderr, "Killed")) ->
          "Your solution ran out of memory, please, rewrite it"

        exit_code == 143 and
            (String.contains?(container_output, "SIGTERM") or
               String.contains?(container_stderr, "SIGTERM")) ->
          "Your solution was executed for longer than 15 seconds, try to write more optimally"

        true ->
          """
          STDERR: #{container_stderr}\n
          STDOUT: #{container_output}
          """
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

  defp compare_results_with_asserts(
         %{solution_results: %{"type" => "error"} = item, container_stderr: container_stderr} = token
       ) do
    # {"time":0,"type":"error","value":"undefined function sdf/0 (there is no such import)"}
    check_result = %Result.V2{
      exit_code: token.exit_code,
      status: "error",
      output_error: """
      STDERR:\n#{to_string(item["value"]) <> to_string(container_stderr)}
      """
    }

    %{token | check_result: check_result}
  end

  defp compare_results_with_asserts(
         %{solution_results: [%{"type" => "error"} = item], container_stderr: container_stderr} = token
       ) do
    # {"time":0,"type":"error","value":"undefined function sdf/0 (there is no such import)"}
    check_result = %Result.V2{
      exit_code: token.exit_code,
      status: "error",
      output_error: """
      STDERR:\n#{item["value"] <> to_string(container_stderr)}
      """
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
      | check_result: %{
          token.check_result
          | asserts: failure_asserts ++ success_asserts,
            success_count: success_count,
            asserts_count: asserts_count,
            status: status
        }
    }
  end
end
