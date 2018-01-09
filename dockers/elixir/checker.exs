Code.require_file "check/solution.exs"

ESpec.start
# ExUnit.configure(capture_log: true)

defmodule TheTest do
  use ESpec

  def input_loop(stream) do
    case IO.read(stream, :line) do
      :eof -> :ok

      {:error, reason} -> IO.puts "Error: #{reason}"

      data ->
        data = Poison.decode!(data)
        case Map.get(data, "check") do
          nil ->
            %{"arguments" => args, "expected" => expected} = data
            result = apply(Solution, :solution, args)
            # IO.inspect result
            # assert expected == result
            expect(expected).to eq(result)
            input_loop(stream)
          check_code ->
            IO.puts check_code
            input_loop(stream)
        end
    end
  end


  it "returns defaults" do
    input_loop(:stdio)
  end
end

ESpec.run
exit :normal
