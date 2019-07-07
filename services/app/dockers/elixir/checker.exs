try do
  Code.eval_file("check/solution.exs")

  ExUnit.start()
  # ExUnit.configure(capture_log: true)

  defmodule TheTest do
    use ExUnit.Case

    def input_loop(stream) do
      case IO.read(stream, :line) do
        :eof ->
          :ok

        {:error, reason} ->
          IO.puts("Error: #{reason}")

        data ->
          data = Jason.decode!(data)

          case Map.get(data, "check") do
            nil ->
              %{"arguments" => args, "expected" => expected} = data
              result = apply(Solution, :solution, args)

              try do
                assert expected == result
                input_loop(stream)
              rescue
                _e in ExUnit.AssertionError ->
                  IO.puts(Jason.encode!(%{status: :failure, result: args}))
                  exit(:normal)
                  input_loop(stream)
              end

            check_code ->
              IO.puts(Jason.encode!(%{status: :ok, result: check_code}))
              input_loop(stream)
          end
      end
    end

    test "solution" do
      input_loop(:stdio)
    end
  end

  exit(:normal)
rescue
  e in CompileError ->
    IO.puts(Jason.encode!(%{status: :error, result: e.description}))
end
