defmodule Solution do
  def solution(numerator, denominator, string, _float, _bool, _hash, _list_str, _list_list_str) do
    res = numerator / denominator

    IO.puts("output-test")

    res
  rescue
    e ->
      IO.puts("don't do it" <> "  " <> e.message)
      raise "AAAAAAAAA"
  end
end
