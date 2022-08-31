defmodule AtomizedMap do
  @moduledoc false
  @behaviour Ecto.Type

  def type, do: :map

  def cast(data) do
    {:ok, Utils.atomize_keys(data)}
  end

  def load(data) when is_binary(data) do
    loaded_data =
      data
      |> Jason.decode!()
      |> Utils.atomize_keys()

    {:ok, loaded_data}
  end

  def load(data) when is_map(data) do
    loaded_data = data |> Utils.atomize_keys()

    {:ok, loaded_data}
  end

  def dump(data), do: Jason.encode(data)
  def equal?(a, b), do: a == b
  def embed_as(_), do: :self
end
