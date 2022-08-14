try do
  Code.eval_file("./check/solution.exs")

  ExUnit.start()
  # ExUnit.configure(capture_log: true)

  defmodule TheTest do
    use ExUnit.Case
    alias Jason.Helpers
    import Helpers

    defp assert_result(result, expected, error_message, success) do
      try do
        assert result == expected
        message = json_map(status: :success, result: result)
        IO.puts(Jason.encode!(message))
        success
      rescue
        _e in ExUnit.AssertionError ->
          message = json_map(status: "failure", result: result, arguments: error_message)
          IO.puts(Jason.encode!(message))
          false
      end
    end

    defp test_solution(success) do
      success = assert_result(apply(Solution, :solution, [1, 2]), 3, [1, 2], success)
      success = assert_result(apply(Solution, :solution, [3, 5]), 8, [3, 5], success)
      if success do
        message = json_map(status: :ok, result: "lolKek")
        IO.puts(Jason.encode!(message))
      end
      :ok
    end

    test "solution" do
      test_solution(true)
    end
  end

  exit(:normal)
rescue
  e in CompileError ->
    require Jason.Helpers
    message = Jason.Helpers.json_map(status: "error", result: e.description)
    IO.puts(Jason.encode!(message))
end
