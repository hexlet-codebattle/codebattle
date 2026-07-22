defmodule Runner.AtomizedMapTest do
  use ExUnit.Case, async: true

  alias Runner.AtomizedMap

  test "implements the Ecto type callbacks" do
    assert AtomizedMap.type() == :map
    assert AtomizedMap.embed_as(:json) == :self
    assert AtomizedMap.equal?(%{answer: 42}, %{answer: 42})
    refute AtomizedMap.equal?(%{answer: 42}, %{answer: 43})

    assert {:ok, encoded} = AtomizedMap.dump(%{answer: 42})
    assert Jason.decode!(encoded) == %{"answer" => 42}
  end

  test "casts and loads nested maps with atom keys" do
    value = %{"outer" => [%{"inner" => 1}, %{"inner" => 2}], "enabled" => true}
    expected = %{outer: [%{inner: 1}, %{inner: 2}], enabled: true}

    assert AtomizedMap.cast(value) == {:ok, expected}
    assert AtomizedMap.load(value) == {:ok, expected}
    assert AtomizedMap.load(Jason.encode!(value)) == {:ok, expected}
  end

  test "preserves dates and converts other structs to maps" do
    date_time = ~N[2026-07-20 12:30:00]

    assert AtomizedMap.atomize(date_time) == date_time

    assert %{scheme: "https", host: "codebattle.hexlet.io"} =
             AtomizedMap.atomize(URI.parse("https://codebattle.hexlet.io"))
  end

  test "leaves scalar values and atom keys unchanged" do
    assert AtomizedMap.atomize([]) == []
    assert AtomizedMap.atomize(42) == 42
    assert AtomizedMap.key_to_atom("answer") == :answer
    assert AtomizedMap.key_to_atom(:answer) == :answer
  end
end
