defmodule AtomizedMap do
  @moduledoc false
  @behaviour Ecto.Type

  def type, do: :map

  def cast(data) do
    {:ok, atomize(data)}
  end

  def load(data) when is_binary(data) do
    loaded_data =
      data
      |> Jason.decode!()
      |> atomize()

    {:ok, loaded_data}
  end

  def load(data) when is_map(data) do
    {:ok, atomize(data)}
  end

  def dump(data), do: Jason.encode(data)
  def equal?(a, b), do: a == b
  def embed_as(_), do: :self

  def atomize(%NaiveDateTime{} = map), do: map

  def atomize(map) when is_struct(map),
    do: map |> Map.from_struct() |> atomize

  def atomize(map) when is_map(map) do
    map
    |> Map.new(fn {k, v} -> {key_to_atom(k), atomize(v)} end)
    |> Enum.into(%{})
  end

  def atomize([head | rest] = list) when is_list(list),
    do: [atomize(head) | atomize(rest)]

  def atomize(not_a_map), do: not_a_map

  def key_to_atom(k) when is_binary(k), do: String.to_atom(k)
  def key_to_atom(k), do: k
end
