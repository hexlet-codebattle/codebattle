defmodule Codebattle.Generators.SolutionTemplateGenerator do
  @moduledoc ~S"""
  Parses the given params into a solution template for game

  ## Examples

      iex> Codebattle.Generators.SolutionTemplateGenerator.get_solution(
      ...>    Codebattle.Languages.meta() |> Map.get("ruby"),
      ...>    %{
      ...>      input_signature: [
      ...>        %{"argument-name" => "a", "type" => %{"name" => "integer"}},
      ...>        %{"argument-name" => "b", "type" => %{"name" => "integer"}}
      ...>      ],
      ...>      output_signature: %{"type" => %{"name" => "integer"}}
      ...>    }
      ...> )
      "def solution(a, b)\n\treturn 0\nend"

      iex> Codebattle.Generators.SolutionTemplateGenerator.get_solution(
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

      iex> Codebattle.Generators.SolutionTemplateGenerator.get_solution(
      ...>    Codebattle.Languages.meta() |> Map.get("clojure"),
      ...>    %{
      ...>      input_signature: [
      ...>        %{"argument-name" => "a", "type" => %{"name" => "float"}},
      ...>        %{"argument-name" => "b", "type" => %{"name" => "float"}}
      ...>      ],
      ...>      output_signature: %{"type" => %{"name" => "hash", "nested" => %{"name" => "float"}}}
      ...>    }
      ...> )
      "(defn solution [a b] {:key 0.1})"

      iex> Codebattle.Generators.SolutionTemplateGenerator.get_solution(
      ...>    Codebattle.Languages.meta() |> Map.get("ts"),
      ...>    %{
      ...>      input_signature: [
      ...>        %{"argument-name" => "a", "type" => %{"name" => "float"}},
      ...>        %{"argument-name" => "b", "type" => %{"name" => "float"}}
      ...>      ],
      ...>      output_signature: %{"type" => %{"name" => "hash", "nested" => %{"name" => "float"}}}
      ...>    }
      ...> )
      "import {IHash} from \"./types\";\n\nfunction solution(a: number, b: number): IHash {\n\n};\n\nexport default solution;"

      iex> Codebattle.Generators.SolutionTemplateGenerator.get_solution(
      ...>    Codebattle.Languages.meta() |> Map.get("golang"),
      ...>    %{
      ...>      input_signature: [
      ...>        %{"argument-name" => "a", "type" => %{"name" => "float"}},
      ...>        %{"argument-name" => "b", "type" => %{"name" => "float"}}
      ...>      ],
      ...>      output_signature: %{"type" => %{"name" => "hash", "nested" => %{"name" => "float"}}}
      ...>    }
      ...> )
      "package main;\n\nfunc solution(a float64, b float64) map[string]float64 {\n\n}"
  """

  @type_langs ["haskell", "python", "ts", "golang"]
  @static_langs ["ts"]

  # require Logger

  alias Codebattle.Generators.TypesGenerator

  def get_solution(%{solution_template: template} = meta, task) do
    bindings = []
              |> add_input_spec(meta, Map.get(task, :input_signature, []))
              |> add_output_spec(meta, Map.get(task, :output_signature, %{}))
              |> add_types(meta, task)

    EEx.eval_string(template, bindings)
  end

  defp add_input_spec(bindings, meta, nil), do: add_empty_input(bindings, meta)
  defp add_input_spec(bindings, meta, input) when input == [], do: add_empty_input(bindings, meta)
  defp add_input_spec(bindings, %{slug: lang} = meta, input) when lang in @type_langs do
    specs = Enum.map_join(input, ", ", &get_input_spec(&1, meta))

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
    %{slug: lang} = meta,
    output_signature
  ) when lang in @type_langs do

    expected = get_expected_type(output_signature, meta)
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
  defp add_output_spec(bindings, meta, _output), do: add_empty_output(bindings, meta)

  defp add_types(bindings, %{slug: lang}, _task) when lang not in @static_langs, do: bindings
  defp add_types(bindings, meta, task) do
    types_import = TypesGenerator.get_import(task, meta)
    Keyword.put(bindings, :import, types_import)
  end

  defp get_input_spec(input, %{slug: "haskell"} = meta) do
    TypesGenerator.get_type(input, meta)
  end
  defp get_input_spec(%{"argument-name" => name} = input, %{slug: "golang"} = meta) do
    "#{name} #{TypesGenerator.get_type(input, meta)}"
  end
  defp get_input_spec(%{"argument-name" => name} = input, meta) do
    "#{name}: #{TypesGenerator.get_type(input, meta)}"
  end

  defp get_args_str(_meta, "php", input) do
    Enum.map_join(input, ", ", &("$#{&1["argument-name"]}"))
  end
  defp get_args_str(_meta, "clojure", input) do
    Enum.map_join(input, " ", &(&1["argument-name"]))
  end
  defp get_args_str(_meta, _lang, input) do
    Enum.map_join(input, ", ", &(&1["argument-name"]))
  end

  defp get_expected_type(signature, %{slug: "ts"} = meta), do: ": #{TypesGenerator.get_type(signature, meta)} "
  defp get_expected_type(signature, %{slug: "golang"} = meta), do: " #{TypesGenerator.get_type(signature, meta)}"
  defp get_expected_type(signature, meta), do: " -> #{TypesGenerator.get_type(signature, meta)}"

  defp get_default_value(default_values, %{"name" => name, "nested" => nested}) do
    default = Map.get(default_values, name)
    EEx.eval_string(default, [value: get_default_value(default_values, nested)])
  end
  defp get_default_value(default_values, %{"name" => name}), do: Map.get(default_values, name)

  defp add_empty_input(bindings, _meta), do: Keyword.put(bindings, :arguments, "")

  defp add_empty_output(bindings, %{slug: lang}) when lang in @type_langs, do: Keyword.put(bindings, :expected, "")
  defp add_empty_output(bindings, _meta), do: Keyword.put(bindings, :return_statement, "")
end
