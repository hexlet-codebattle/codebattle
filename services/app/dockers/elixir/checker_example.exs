try do
  Code.eval_file("./solution_example.exs")
  require Jason.Helpers

  ExUnit.start()
  # ExUnit.configure(capture_log: true)

  defmodule TheTest do
    use ExUnit.Case
    import Jason.Helpers

    defp assert_result(result, expected, errorMessage) do
      try do
        assert result == expected
      rescue
        _e in ExUnit.AssertionError ->
          message = json_map(status: :failure, result: errorMessage)
          IO.puts(Jason.encode!(message))
          exit(:normal)
      end
    end

    defp test_solution do
      assert_result(apply(Solution, :solution, [1, 2]), 3, [1, 2])
      assert_result(apply(Solution, :solution, [3, 5]), 8, [3, 5])
      message = json_map(status: :ok, result: "__code-0__")
      IO.puts(Jason.encode!(message))
    end

    test "solution" do
      test_solution()
    end
  end

  exit(:normal)
rescue
  e in CompileError ->
    message = Jason.Helper.json_map(status: :error, result: e.description)
    IO.puts(Jason.encode!(message))
end
