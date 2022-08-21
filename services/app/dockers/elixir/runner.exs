defmodule Runner do
  try do
    Code.eval_file("./check/solution.exs")
  rescue
    e in CompileError ->
      IO.inspect(Jason.encode!(%{type: "error", value: e.description, time: 0}))
      System.halt(0)

    e ->
      IO.inspect(Jason.encode!(%{type: "error", value: e.message, time: 0}))
      System.halt(0)
  end

  import ExUnit.CaptureIO

  def call(arguments) do
    arguments
    |> Enum.reduce([], fn args, acc ->
      {time, {result, output}} =
        :timer.tc(fn ->
          with_io(fn ->
            try do
              %{
                type: "result",
                value: apply(Solution, :solution, args)
              }
            rescue
              e ->
                %{
                  type: "error",
                  value: e.message
                }
            end
          end)
        end)

      [
        %{
          type: result.type,
          value: result.value,
          time: to_string(time / 1000),
          output: output
        }
        | acc
      ]
    end)
    |> Enum.reverse()
    |> Enum.each(&(&1 |> Jason.encode!() |> IO.puts()))
  end
end
