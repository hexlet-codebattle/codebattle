defmodule Codebattle.Runner.ArgumentNames do
  @moduledoc false

  # Ruby and Elixir treat an uppercase identifier as a constant/alias. Their
  # keywords cannot be used as formal parameters either. Calls stay positional.
  @reserved ~w(after alias and begin break case catch class cond def defined do else elsif end
    ensure false fn for if in module next nil not or receive redo rescue retry return self
    super then true try undef unless until when while yield __FILE__ __LINE__ __ENCODING__)

  def normalize(signature, %{slug: slug}) when slug in ["ruby", "elixir"] do
    {signature, _used} =
      Enum.map_reduce(signature, MapSet.new(), fn input, used ->
        name = input.argument_name

        candidate =
          if name in @reserved or not Regex.match?(~r/^[a-z_][a-zA-Z0-9_]*$/, name),
            do: "arg_" <> String.replace(name, ~r/[^a-zA-Z0-9_]/, "_"),
            else: name

        candidate = unique_name(candidate, used, 1)
        {%{input | argument_name: candidate}, MapSet.put(used, candidate)}
      end)

    signature
  end

  def normalize(signature, _meta), do: signature

  defp unique_name(name, used, suffix) do
    candidate = if suffix == 1, do: name, else: "#{name}_#{suffix}"
    if MapSet.member?(used, candidate), do: unique_name(name, used, suffix + 1), else: candidate
  end
end
