defmodule Codebattle.AssertsService do
  @moduledoc """
  Asserts service for tasks (validation and generation).
  """

  @doc """
  Validates asserts.
  """
  @spec valid_asserts?(any(), any()) :: boolean()
  def valid_asserts?([], _), do: false
  def valid_asserts?([[]], _), do: false

  def valid_asserts?(asserts, dest) when is_map(dest) do
    typed_asserts = type_asserts(asserts)
    prepared_dest = [Map.delete(dest, "argument-name")]

    typed_asserts == prepared_dest
  end

  def valid_asserts?(asserts, dest) do
    typed_asserts = type_asserts(asserts)
    prepared_dest = dest |> Enum.map(&Map.delete(&1, "argument-name"))

    typed_asserts == prepared_dest
  end

  @doc """
  Extract types from passed asserts.
  """
  @spec type_asserts([any()]) :: any()
  def type_asserts(asserts) do
    asserts |> Enum.map(&get_type/1)
  end

  defp get_type(element) when is_map(element) do
    value = element |> Map.values() |> hd
    %{"name" => "hash", "nested" => get_type(value)}
  end

  defp get_type(element) when is_list(element) do
    value = hd(element)
    %{"name" => "array", "nested" => get_type(value)}
  end

  defp get_type(element) when is_integer(element), do: %{"name" => "integer"}
  defp get_type(element) when is_bitstring(element), do: %{"name" => "string"}
  defp get_type(element) when is_float(element), do: %{"name" => "float"}
  defp get_type(element) when is_boolean(element), do: %{"name" => "boolean"}
end
