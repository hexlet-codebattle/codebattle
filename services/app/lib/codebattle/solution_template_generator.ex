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

      iex> Codebattle.SolutionTemplateGenerator.get_solution(
      ...>    Codebattle.Languages.meta() |> Map.get("ts"),
      ...>    %{
      ...>      input_signature: [
      ...>        %{"argument-name" => "a", "type" => %{"name" => "float"}},
      ...>        %{"argument-name" => "b", "type" => %{"name" => "float"}}
      ...>      ],
      ...>      output_signature: %{"type" => %{"name" => "hash", "nested" => %{"name" => "float"}}}
      ...>    }
      ...> )
      "export interface IHash {\n\t[key: string]: number;\n}\n\nexport default function solution(a: number, b: number): IHash {\n\n};"
  """

  @type_langs ["haskell", "python", "ts"]
  @static_langs ["ts"]

  # require Logger

  def get_solution(%{slug: lang, solution_template: template} = meta, task) do
    bindings = []
              |> add_input_spec(meta, Map.get(task, :input_signature, []))
              |> add_output_spec(meta, Map.get(task, :output_signature, %{}))
              |> add_interfaces_spec(meta, task)

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
    %{slug: lang, types: lang_types},
    output_signature
  ) when lang in @type_langs do

    expected = get_expected_type(output_signature, lang, lang_types)
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

  defp add_interfaces_spec(bindings, %{slug: lang}, _task) when lang not in @static_langs, do: bindings
  defp add_interfaces_spec(
    bindings,
    %{slug: "ts"} = meta,
    %{input_signature: input_signature, output_signature: output_signature}
  ) do

    hashs = get_hashs(input_signature, output_signature)
    interfaces = get_interfaces_formatted(hashs, meta, "")

    Keyword.put(bindings, :interfaces, interfaces)
  end

  defp get_input_spec(%{"type" => type}, %{slug: "haskell", types: lang_types}) , do: get_type(type, lang_types)
  defp get_input_spec(%{"argument-name" => name, "type" => type}, %{slug: "python", types: lang_types}) do
    "#{name}: #{get_type(type, lang_types)}"
  end
  defp get_input_spec(%{"argument-name" => name, "type" => type} = input, %{slug: "ts", types: lang_types}) do
    if is_hash(input) do
      "#{name}: #{get_interface_name(input, "ts")}"
    else
      "#{name}: #{get_type(type, lang_types)}"
    end
  end

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

  defp get_expected_type(%{"type" => %{"name" => "hash"}} = output, "ts", _lang_types) do
    ": #{get_interface_name(output, "ts")} "
  end
  defp get_expected_type(%{"type" => type}, "ts", lang_types), do: ": #{get_type(type, lang_types)} "
  defp get_expected_type(%{"type" => type}, _lang, lang_types), do: " -> #{get_type(type, lang_types)}"

  defp get_default_value(default_values, %{"name" => name, "nested" => nested}) do
    default = Map.get(default_values, name)
    EEx.eval_string(default, [value: get_default_value(default_values, nested)])
  end
  defp get_default_value(default_values, %{"name" => name}), do: Map.get(default_values, name)

  defp get_hashs(nil, nil), do: []
  defp get_hashs(nil, %{"type" => %{"name" => "hash"}} = output_signature), do: output_signature
  defp get_hashs(input_signature, nil), do: Enum.filter(input_signature, &is_hash/1)
  defp get_hashs(input_signature, output_signature), do: Enum.filter(input_signature ++ [output_signature], &is_hash/1)

  defp is_hash(%{"type" => %{"name" => "hash"}}), do: true
  defp is_hash(_), do: false

  defp get_interfaces_formatted(hashs, _meta, acc) when hashs == [], do: acc
  defp get_interfaces_formatted(
    [%{"type" => %{"nested" => nested}} = interface | rest],
    %{slug: lang, types: lang_types} = meta,
    acc
  ) do

    formatted_name = get_interface_name(interface, lang)
    value_type = get_type(nested, lang_types)
    new_acc = add_interface(acc, lang, %{name: formatted_name, value_type: value_type})

    get_interfaces_formatted(rest, meta, new_acc)
  end

  defp get_interface_name(%{"argument-name" => name}, "ts") do
    name
    |> case_words()
    |> Enum.map_join(&(String.capitalize(&1)))
  end
  defp get_interface_name(_, "ts"), do: "IHash"

  defp case_words(str) do
    String.split(str, ~r{_})
  end

  defp add_interface(acc, "ts", %{name: name, value_type: value}) do
    "#{acc}export interface #{name} {\n\t[key: string]: #{value};\n}\n\n"
  end

  defp add_empty_input(bindings, _meta), do: Keyword.put(bindings, :arguments, "")

  defp add_empty_output(bindings, %{slug: lang}) when lang in @type_langs, do: Keyword.put(bindings, :expected, "")
  defp add_empty_output(bindings, _meta), do: Keyword.put(bindings, :return_statement, "")
end
