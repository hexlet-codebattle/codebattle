defmodule Codebattle.Generators.SolutionTemplateGenerator do
  @moduledoc ~S"""
  Parses the given params into a solution template for game

  ## Examples

      iex> Codebattle.Generators.SolutionTemplateGenerator.get_solution(
      ...>    Codebattle.Languages.meta() |> Map.get("ruby"),
      ...>    %{
      ...>      input_signature: [
      ...>        %{argument_name: "a", type: %{name: "integer"}},
      ...>        %{argument_name: "b", type: %{name: "integer"}}
      ...>      ],
      ...>      output_signature: %{type: %{name: "integer"}}
      ...>    }
      ...> )
      "def solution(a, b)\n\t0\nend"

      iex> Codebattle.Generators.SolutionTemplateGenerator.get_solution(
      ...>    Codebattle.Languages.meta() |> Map.get("python"),
      ...>    %{
      ...>      input_signature: [
      ...>        %{argument_name: "str1", type: %{name: "string"}},
      ...>        %{argument_name: "str2", type: %{name: "string"}}
      ...>      ],
      ...>      output_signature: %{type: %{name: "string"}}
      ...>    }
      ...> )
      "from typing import List, Dict\n\ndef solution(str1: str, str2: str) -> str:"

      iex> Codebattle.Generators.SolutionTemplateGenerator.get_solution(
      ...>    Codebattle.Languages.meta() |> Map.get("clojure"),
      ...>    %{
      ...>      input_signature: [
      ...>        %{argument_name: "a", type: %{name: "float"}},
      ...>        %{argument_name: "b", type: %{name: "float"}}
      ...>      ],
      ...>      output_signature: %{type: %{name: "hash", nested: %{name: "float"}}}
      ...>    }
      ...> )
      "(defn solution [a b] {:key 0.1})"

      iex> Codebattle.Generators.SolutionTemplateGenerator.get_solution(
      ...>    Codebattle.Languages.meta() |> Map.get("ts"),
      ...>    %{
      ...>      input_signature: [
      ...>        %{argument_name: "a", type: %{name: "float"}},
      ...>        %{argument_name: "b", type: %{name: "float"}}
      ...>      ],
      ...>      output_signature: %{type: %{name: "hash", nested: %{name: "float"}}}
      ...>    }
      ...> )
      "import * as _ from \"lodash\";\nimport {IHash} from \"./types\";\n\nfunction solution(a: number, b: number): IHash {\n\n};\n\nexport default solution;"

      iex> Codebattle.Generators.SolutionTemplateGenerator.get_solution(
      ...>    Codebattle.Languages.meta() |> Map.get("golang"),
      ...>    %{
      ...>      input_signature: [
      ...>        %{argument_name: "a", type: %{name: "float"}},
      ...>        %{argument_name: "b", type: %{name: "float"}}
      ...>      ],
      ...>      output_signature: %{type: %{name: "hash", nested: %{name: "float"}}}
      ...>    }
      ...> )
      "package main;\n\nfunc solution(a float64, b float64) map[string]float64 {\n\n}"
  """

  @static_langs ["ts"]

  # require Logger

  alias Codebattle.Generators.TypesGenerator

  def get_solution(%{solution_template: template} = meta, task) do
    bindings =
      []
      |> add_input_spec(meta, Map.get(task, :input_signature, []))
      |> add_output_spec(meta, Map.get(task, :output_signature, %{}))
      |> add_types(meta, task)

    EEx.eval_string(template, bindings)
  end

  defp add_input_spec(bindings, _meta, nil), do: add_empty_input(bindings)
  defp add_input_spec(bindings, _meta, input) when input == [], do: add_empty_input(bindings)

  defp add_input_spec(bindings, %{solution_version: version} = meta, input)
       when version !== :empty do
    %{
      argument: template,
      delimiter: delimiter
    } = meta.arguments_template

    arguments =
      Enum.map_join(
        input,
        delimiter,
        &EEx.eval_string(template,
          name: &1.argument_name,
          type: TypesGenerator.get_type(&1, meta)
        )
      )

    Keyword.put(bindings, :arguments, arguments)
  end

  defp add_input_spec(bindings, _meta, _input), do: add_empty_input(bindings)

  defp add_output_spec(bindings, _meta, nil), do: add_empty_output(bindings)

  defp add_output_spec(bindings, _meta, output) when map_size(output) == 0,
    do: add_empty_output(bindings)

  defp add_output_spec(
         bindings,
         %{solution_version: :typed, expected_template: template} = meta,
         output_signature
       ) do
    output_type = TypesGenerator.get_type(output_signature, meta)
    expected = EEx.eval_string(template, type: output_type)

    Keyword.put(bindings, :expected, expected)
  end

  defp add_output_spec(
         bindings,
         %{
           solution_version: version,
           return_template: return_template,
           default_values: default_values
         },
         %{type: type}
       )
       when version !== :empty do
    value = get_default_value(default_values, type)
    return_statement = EEx.eval_string(return_template, default_value: value)
    Keyword.put(bindings, :return_statement, return_statement)
  end

  defp add_output_spec(bindings, _meta, _output), do: add_empty_output(bindings)

  defp add_types(bindings, %{slug: lang}, _task) when lang not in @static_langs, do: bindings

  defp add_types(bindings, meta, task) do
    types_import = TypesGenerator.get_import(task, meta)
    Keyword.put(bindings, :import, types_import)
  end

  defp get_default_value(default_values, %{name: name, nested: nested}) do
    default = Map.get(default_values, name)
    EEx.eval_string(default, value: get_default_value(default_values, nested))
  end

  defp get_default_value(default_values, %{name: name}), do: Map.get(default_values, name)

  defp add_empty_input(bindings), do: Keyword.put(bindings, :arguments, "")

  defp add_empty_output(bindings),
    do: bindings |> Keyword.put(:expected, "") |> Keyword.put(:return_statement, "")
end
