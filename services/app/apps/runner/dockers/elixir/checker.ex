defmodule Checker do
  import ExUnit.CaptureIO

  def main(_args) do
    arguments = Jason.decode!(File.read!(Path.join(__DIR__, ~c"./check/asserts.json")))

    try do
      Code.eval_file("./check/solution.exs")
    rescue
      e ->
        IO.puts(
          Jason.encode!([
            %{
              type: "error",
              time: 0,
              value: inspect(e)
            }
          ])
        )

        System.halt(0)
    end

    arguments["arguments"]
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
                  value: inspect(e)
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
    |> Jason.encode!()
    |> IO.puts()
  end
end
