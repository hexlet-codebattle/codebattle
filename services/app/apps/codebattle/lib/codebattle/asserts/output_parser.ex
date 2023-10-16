defmodule Codebattle.AssertsService.OutputParser do
  @moduledoc "Parse container output for representing check status of solution"

  require Logger

  alias Codebattle.AssertsService.AssertResult
  alias Codebattle.AssertsService.Result
  alias Codebattle.AtomizedMap

  def call(checker_token) do
    %{container_output: container_output, exit_code: exit_code} = checker_token

    result_token = %{
      execution_result: nil,
      container_output: container_output,
      exit_code: exit_code
    }

    result_token
    |> parse_output()
    |> Map.get(:execution_result)
  end

  defp parse_output(token = %{exit_code: 0}) do
    %{token | execution_result: Jason.decode!(token.container_output)}
  rescue
    _e ->
      asserts_result =
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
        |> Enum.map(&parse_assert_result/1)

      status =
        cond do
          Enum.any?(asserts_result, fn assert -> assert.status == "error" end) ->
            "error"

          Enum.any?(asserts_result, fn assert -> assert.status == "failure" end) ->
            "failure"

          true ->
            "ok"
        end

      %{
        token
        | execution_result: %Result{
            asserts: asserts_result,
            status: status,
            exit_code: token.exit_code
          }
      }
  end

  defp parse_output(token) do
    %{container_output: container_output, exit_code: exit_code} = token

    output_error =
      cond do
        exit_code == 2 and String.contains?(container_output, "Killed") ->
          "Your solution/arguments generator ran out of memory, please, rewrite them"

        exit_code == 143 and String.contains?(container_output, "SIGTERM") ->
          "Your solution/arguments generator were executed for longer than 15 seconds, try to write more optimally"

        true ->
          "Something went wrong! Please, write to dev team in our Telegram \n UNKNOWN_ERROR: #{container_output}}"
      end

    %{
      token
      | execution_result: %Result{
          exit_code: exit_code,
          output_error: output_error,
          asserts: [],
          status: "error"
        }
    }
  end

  defp parse_assert_result(item = %{"type" => "result"}) do
    status =
      if AtomizedMap.atomize(item["actual"]) == AtomizedMap.atomize(item["expected"]) do
        "success"
      else
        "failure"
      end

    %AssertResult{
      status: status,
      arguments: item["arguments"],
      actual: item["actual"],
      expected: item["expected"],
      output: item["output"],
      execution_time: item["time"]
    }
  end

  defp parse_assert_result(item),
    do: %AssertResult{
      status: item["type"],
      arguments: item["arguments"],
      actual: item["expected"] || "",
      expected: item["expected"] || "",
      message: item["message"] || "",
      output: item["output"] || "",
      execution_time: item["item"] || 0.0
    }
end
