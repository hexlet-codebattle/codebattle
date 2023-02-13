defmodule Solution do
  def solution(numerator, denominator) do
    res = numerator / denominator

    IO.puts("output-test")

    res
  rescue
    e ->
      IO.puts("don't do it" <> "  " <> e.message)
      raise "AAAAAAAAA"
  end
end
