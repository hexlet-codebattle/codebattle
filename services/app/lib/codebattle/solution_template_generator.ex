defmodule Codebattle.SolutionTemplateGenerator do
  @moduledoc ~S"""
  Parses the given params into a solution template for game

  ## Examples

      iex> Codebattle.SolutionTemplateGenerator.get_solution(
      ...>    Codebattle.Languages.meta() |> Map.get("ruby"),
      ...>    %{
      ...>      input_signature: [
      ...>        %{"argument-name" => "a", "type" => %{"name" => "integer"}},
      ...>        %{"argument-name" => "b", "type" => %{"name" => "integer"}}
      ...>      ],
      ...>      output_signature: %{"type" => %{"name" => "integer"}}
      ...>    }
      ...> )
      "def solution(a, b)\n\t0\nend"

      iex> Codebattle.SolutionTemplateGenerator.get_solution(
      ...>    Codebattle.Languages.meta() |> Map.get("python"),
      ...>    %{
      ...>      input_signature: [
      ...>        %{"argument-name" => "str1", "type" => %{"name" => "string"}},
      ...>        %{"argument-name" => "str2", "type" => %{"name" => "string"}}
      ...>      ],
      ...>      output_signature: %{"type" => %{"name" => "string"}}
      ...>    }
      ...> )
      "def solution(str1: str, str2: str) -> str:"

      iex> Codebattle.SolutionTemplateGenerator.get_solution(
      ...>    Codebattle.Languages.meta() |> Map.get("clojure"),
      ...>    %{
      ...>      input_signature: [
      ...>        %{"argument-name" => "a", "type" => %{"name" => "float"}},
      ...>        %{"argument-name" => "b", "type" => %{"name" => "float"}}
      ...>      ],
      ...>      output_signature: %{"type" => %{"name" => "hash", "nested" => %{"name" => "float"}}}
      ...>    }
      ...> )
      "(defn solution [a, b] {\"key\": 0.1})"
  """

  @type_langs ["haskell", "python"]

  # require Logger

  def get_solution(%{slug: lang, solution_template: template} = meta, task) do
    bindings = []
              |> add_input_spec(meta, Map.get(task, :input_signature, []))
              |> add_output_spec(meta, Map.get(task, :output_signature, %{}))

    EEx.eval_string(template, bindings)
  end

  defp add_input_spec(bindings, meta, nil), do: add_empty_input(bindings, meta)
  defp add_input_spec(bindings, meta, input) when input == [], do: add_empty_input(bindings, meta)
  defp add_input_spec(bindings, %{slug: lang, types: lang_types} = meta, input) when lang in @type_langs do
    specs = Enum.map_join(input, ", ", fn %{"argument-name" => name, "type" => type} ->
      arg_type = get_type(type, lang_types)
      get_input_spec(name, lang, arg_type)
    end)

    Keyword.put(bindings, :arguments, specs)
  end
  defp add_input_spec(bindings, %{slug: lang} = meta, input) when lang not in ["perl"] do
    input_args_str = get_args_str(meta, lang, input)
    Keyword.put(bindings, :arguments, input_args_str)
  end
  defp add_input_spec(bindings, meta, _input), do: add_empty_input(bindings, meta)

  defp add_output_spec(bindings, meta, nil), do: add_empty_output(bindings, meta)
  defp add_output_spec(bindings, meta, output) when map_size(output) == 0, do: add_empty_output(bindings, meta)
  defp add_output_spec(
    bindings,
    %{slug: lang, types: lang_types},
    %{"type" => type}
  ) when lang in @type_langs do

    expected = " -> #{get_type(type, lang_types)}"
    Keyword.put(bindings, :expected, expected)
  end
  defp add_output_spec(
    bindings,
    %{slug: lang, return_template: return_template, default_values: default_values},
    %{"type" => type}
  ) when lang not in ["perl"] do

    value = get_default_value(default_values, type)
    return_statement = EEx.eval_string(return_template, [default_value: value])
    Keyword.put(bindings, :return_statement, return_statement)
  end
  defp add_output_spec(binding, meta, _output), do: add_empty_output(binding, meta)

  defp get_input_spec(name, "python", arg_type), do: "#{name}: #{arg_type}"
  defp get_input_spec(_name, "haskell", arg_type), do: arg_type

  defp get_args_str(_meta, "php", input) do
    Enum.map_join(input, ", ", &("$#{&1["argument-name"]}"))
  end
  defp get_args_str(_meta, _lang, input) do
    Enum.map_join(input, ", ", &(&1["argument-name"]))
  end

  defp get_type(%{"name" => name, "nested" => nested}, lang_types) do
    type = Map.get(lang_types, name)
    EEx.eval_string(type, [inner_type: get_type(nested, lang_types)])
  end
  defp get_type(%{"name" => name}, lang_types), do: Map.get(lang_types, name)

  defp get_default_value(default_values, %{"name" => name, "nested" => nested}) do
    default = Map.get(default_values, name)
    EEx.eval_string(default, [value: get_default_value(default_values, nested)])
  end
  defp get_default_value(default_values, %{"name" => name}), do: Map.get(default_values, name)

  defp add_empty_input(bindings, _meta), do: Keyword.put(bindings, :arguments, "")

  defp add_empty_output(bindings, %{slug: lang}) when lang in @type_langs, do: Keyword.put(bindings, :expected, "")
  defp add_empty_output(bindings, _meta), do: Keyword.put(bindings, :return_statement, "")
end
