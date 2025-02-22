defmodule Utils do
  @moduledoc false
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

  def sanitize_jsonb(json_string) when is_binary(json_string) do
    json_string
    |> remove_null_bytes()
    |> replace_invalid_unicode_escape_sequences()
  end

  def sanitize_jsonb(_), do: ""

  # Remove null bytes from JSON string
  defp remove_null_bytes(json_string) do
    String.replace(json_string, <<0>>, "")
  end

  # Replace invalid Unicode escape sequences with placeholders
  defp replace_invalid_unicode_escape_sequences(json_string) do
    Regex.replace(~r/\\u([0-9A-Fa-f]{4})/, json_string, fn _, match ->
      code_point = String.to_integer(match, 16)

      if code_point < 128 do
        <<code_point>>
      else
        # Replace with placeholder for invalid sequences
        "?"
      end
    end)
  end
end
