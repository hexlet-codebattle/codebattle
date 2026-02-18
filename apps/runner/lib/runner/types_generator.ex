defmodule Runner.TypesGenerator do
  def call(_signature, %{types: types}) when is_nil(types), do: ""

  def call(%{nested: nested, name: name}, meta) do
    type = Map.get(meta.types, name)
    EEx.eval_string(type, inner_type: call(nested, meta))
  end

  def call(%{name: name}, meta), do: Map.get(meta.types, name)
end
