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
end
