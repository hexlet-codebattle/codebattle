defmodule Utils do
  def blank?(x) when is_binary(x) do
    String.trim(x) == ""
  end

  def blank?(x) do
    x in [%{}, {}, [], nil, false]
  end

  def present?(x), do: not blank?(x)

  def presence(x) do
    if present?(x) do
      x
    else
      nil
    end
  end

  # Thx to https://github.com/reeesga/elixir-rotate-lists/blob/master/lib/list_rotation.ex
  #
  def left_rotate(l, n \\ 1)
  def left_rotate([], _), do: []
  def left_rotate(l, 0), do: l
  def left_rotate([h | t], 1), do: t ++ [h]
  def left_rotate(l, n) when n > 0, do: left_rotate(left_rotate(l, 1), n - 1)
  def left_rotate(l, n), do: right_rotate(l, -n)

  def right_rotate(l, n \\ 1)

  def right_rotate(l, n) when n > 0 do
    l |> Enum.reverse() |> left_rotate(n) |> Enum.reverse()
  end

  def right_rotate(l, n), do: left_rotate(l, -n)
end
