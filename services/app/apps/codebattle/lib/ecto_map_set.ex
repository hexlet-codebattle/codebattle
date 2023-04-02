# SEE: https://github.com/ityonemo/ecto_map_set/blob/main/lib/ecto_map_set.ex
defmodule EctoMapSet do
  @moduledoc """
  MapSet support for Ecto.
  The MapSets are backed by arrays in postgres.  Currently untested in other
  database engines.
  ## Typed MapSets
  ### Migration Example:
  ```elixir
  def change do
    create table(:my_sets) do
      add(:favorite_floats, {:array, :float})
    end
  end
  ```
  ### Schema Example:
  ```elixir
  def MySet do
    use Ecto.Schema
    schema "my_sets" do
      field :favorite_floats, EctoMapSet, of: :float
    end
  end
  ```
  Then when you retrieve your row, the data will be marshalled into
  a MapSet:
  ```elixir
  iex> Repo.get(MySet, id)
  %MySet{favorite_floats: %MapSet<[47.0, 88.8]>}}
  ```
  If you use an ecto changeset to marshal your data in, your mapset
  column may be any sort of enumerable.  In most cases that will be
  a `MapSet`, a `List`, or a `Stream`.
  NB: for PostgreSQL, if you are making a mapset of arrays, they must
  all have the same length.  This is a limitation of PostgreSQL.  This happens
  for a schema that looks like this:
  ```
  schema "my_vectors" do
    field :vectors, EctoMapSet, of: {:array, :float}
  end
  ```
  ## Untyped MapSets
  ### Migration Example:
  ```elixir
  def change do
    create table(:my_untyped_sets) do
      add(:favorite_terms, {:array, :binary})
    end
  end
  ```
  ### Schema Example:
  ```elixir
  def MyUntypedSet do
    use Ecto.Schema
    schema "my_untyped_sets" do
      field :favorite_terms, EctoMapSet, of: :term
    end
  end
  ```
  Then when you retrieve your row, the data will be marshalled into
  a MapSet:
  ```elixir
  iex> Repo.get(MySet, id)
  %MySet{favorite_terms: %MapSet<[#PID<0.107.0>, :foo, "bar"}}
  ```
  ### Safety
  the `EctoMapSet` field declaration can take two safety options:
  - `:safety` sets the safety level
    - `:unsafe` returns an unsafe row with no safety checks.
    - `:drop` returns an unsafe row with all unsafe data redacted from the set (default).
    - `:errors` raises ArgumentError when you try to pull an unsafe row.
  - `:non_executable`
    - `true` any stored term with a lambda will trigger a safety check.  Note in order
       to use this feature you must include the `plug_crypto` library.
    - `false` or `nil` (default) only unsafe atoms are checked.
  """

  use Ecto.ParameterizedType

  @default_options %{safety: :drop}

  @impl true
  def type(%{of: :term}), do: {:array, :binary}
  def type(opts), do: {:array, opts[:of]}

  @impl true
  def init(opts) do
    Enum.into(opts, @default_options)
  end

  @impl true
  def cast(data, %{of: :term, non_executable: true}) do
    result =
      data
      |> reject_nonexecutable
      |> MapSet.new(data)

    {:ok, result}
  catch
    :error -> :error
  end

  def cast(data, %{of: :term}) do
    result = MapSet.new(data)
    {:ok, result}
  end

  def cast(data, params) do
    result =
      MapSet.new(data, fn datum ->
        case Ecto.Type.cast(params.of, datum) do
          {:ok, cast} -> cast
          error -> throw(error)
        end
      end)

    {:ok, result}
  catch
    error -> error
  end

  defp reject_nonexecutable(fun) when is_function(fun), do: throw(:error)

  defp reject_nonexecutable(enum) when is_list(enum) or is_map(enum) do
    Enum.each(enum, &reject_nonexecutable/1)
    enum
  end

  defp reject_nonexecutable(tup) when is_tuple(tup) do
    tup |> Tuple.to_list() |> reject_nonexecutable
    tup
  end

  defp reject_nonexecutable(other), do: other

  @impl true
  def load(nil, _, _), do: {:ok, nil}

  def load(data, _, opts = %{of: :term, safety: :drop}) do
    binary_to_term = binary_to_term_fn(opts)

    result =
      data
      |> Enum.flat_map(fn datum ->
        try do
          [binary_to_term.(datum)]
        rescue
          ArgumentError -> []
        end
      end)
      |> MapSet.new()

    {:ok, result}
  end

  def load(data, _, opts = %{of: :term}) do
    binary_to_term = binary_to_term_fn(opts)
    {:ok, MapSet.new(data, binary_to_term)}
  rescue
    ArgumentError -> :error
  end

  def load(data, loader, params) do
    result =
      MapSet.new(data, fn datum ->
        case loader.(params.of, datum) do
          {:ok, encoded} -> encoded
          :error -> throw(:error)
        end
      end)

    {:ok, result}
  catch
    :error -> :error
  end

  @impl true
  def dump(nil, _, _), do: {:ok, nil}

  def dump(data, _, %{of: :term}) do
    {:ok, Enum.map(data, &:erlang.term_to_binary/1)}
  end

  def dump(data, dumper, params) do
    result =
      Enum.map(data, fn datum ->
        case dumper.(params.of, datum) do
          {:ok, encoded} -> encoded
          :error -> throw(:error)
        end
      end)

    {:ok, result}
  catch
    :error -> :error
  end

  defp binary_to_term_fn(opts) do
    safety = List.wrap(unless opts[:safety] == :unsafe, do: :safe)

    if opts[:non_executable] do
      &Plug.Crypto.non_executable_binary_to_term(&1, safety)
    else
      &:erlang.binary_to_term(&1, safety)
    end
  end

  @impl true
  def equal?(a, b, _params) do
    a == b
  end
end
