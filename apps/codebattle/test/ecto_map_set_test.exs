defmodule EctoMapSetTest do
  use ExUnit.Case, async: true

  test "initializes typed and term-backed database types" do
    assert EctoMapSet.init(of: :integer) == %{of: :integer, safety: :drop}
    assert EctoMapSet.type(%{of: :integer}) == {:array, :integer}
    assert EctoMapSet.type(%{of: :term}) == {:array, :binary}
  end

  test "casts typed enumerables and reports invalid members" do
    params = %{of: :integer}

    assert EctoMapSet.cast(["1", 2, 2], params) == {:ok, MapSet.new([1, 2])}
    assert EctoMapSet.cast(["not-an-integer"], params) == :error
  end

  test "casts arbitrary terms and optionally rejects executable terms" do
    assert EctoMapSet.cast([:ok, %{answer: 42}], %{of: :term}) ==
             {:ok, MapSet.new([:ok, %{answer: 42}])}

    safe_params = %{of: :term, non_executable: true}

    assert EctoMapSet.cast([{:ok, [1, 2]}, %{answer: 42}], safe_params) ==
             {:ok, MapSet.new([{:ok, [1, 2]}, %{answer: 42}])}

    assert EctoMapSet.cast([fn -> :unsafe end], safe_params) == :error
    assert EctoMapSet.cast(%{callback: fn -> :unsafe end}, safe_params) == :error
    assert EctoMapSet.cast([{:nested, fn -> :unsafe end}], safe_params) == :error
  end

  test "loads and dumps typed sets through Ecto callbacks" do
    loader = fn
      :integer, value when is_integer(value) -> {:ok, value}
      :integer, _value -> :error
    end

    dumper = fn
      :integer, value when is_integer(value) -> {:ok, Integer.to_string(value)}
      :integer, _value -> :error
    end

    assert EctoMapSet.load(nil, loader, %{of: :integer}) == {:ok, nil}
    assert EctoMapSet.load([1, 2, 2], loader, %{of: :integer}) == {:ok, MapSet.new([1, 2])}
    assert EctoMapSet.load([1, "bad"], loader, %{of: :integer}) == :error

    assert EctoMapSet.dump(nil, dumper, %{of: :integer}) == {:ok, nil}

    assert EctoMapSet.dump(MapSet.new([1, 2]), dumper, %{of: :integer}) ==
             {:ok, ["1", "2"]}

    assert EctoMapSet.dump(MapSet.new([1, "bad"]), dumper, %{of: :integer}) == :error
  end

  test "loads and dumps term-backed sets with configurable safety" do
    valid = :erlang.term_to_binary(%{answer: 42})
    unknown_atom = external_atom("ecto_map_set_unknown_atom_#{System.unique_integer([:positive])}")

    assert EctoMapSet.load([valid], nil, %{of: :term, safety: :errors}) ==
             {:ok, MapSet.new([%{answer: 42}])}

    assert EctoMapSet.load([valid, unknown_atom], nil, %{of: :term, safety: :drop}) ==
             {:ok, MapSet.new([%{answer: 42}])}

    assert EctoMapSet.load([unknown_atom], nil, %{of: :term, safety: :errors}) == :error

    assert {:ok, dumped} = EctoMapSet.dump(MapSet.new([%{answer: 42}]), nil, %{of: :term})
    assert dumped == [valid]
  end

  test "uses Plug's non-executable decoder when requested" do
    value = :erlang.term_to_binary(%{answer: 42})

    assert EctoMapSet.load([value], nil, %{of: :term, safety: :errors, non_executable: true}) ==
             {:ok, MapSet.new([%{answer: 42}])}
  end

  test "compares sets by value" do
    assert EctoMapSet.equal?(MapSet.new([1, 2]), MapSet.new([2, 1]), %{})
    refute EctoMapSet.equal?(MapSet.new([1]), MapSet.new([2]), %{})
  end

  defp external_atom(name) do
    <<131, 100, byte_size(name)::16, name::binary>>
  end
end
