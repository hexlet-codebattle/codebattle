defmodule Codebattle.Generators.CheckerGenerator do
  @moduledoc false

  require Logger

  alias Codebattle.Generators.TypesGenerator

  @langs_need_types ["ts"]

  def create(%{extension: extension, slug: slug} = meta, task, target_dir, hash_sum) do
    binding = inflect(task, meta)

    binding =
      binding
      |> Keyword.put(:hash_sum, hash_sum)
      |> put_types(meta, task)

    source_dir = "/dockers/#{slug}"

    Logger.info(
      "Create checker for #{slug} language. NAME: checker.#{extension}, TASK: #{inspect(task)}, BINDING #{
        inspect(binding)
      }"
    )

    Mix.Phoenix.copy_from(["."], source_dir, binding, get_template_specs(target_dir, meta))
  end

  @doc ~S"""

        iex> Codebattle.Generators.CheckerGenerator.inflect(
        ...>    %{
        ...>      asserts: "{\"arguments\": [1, 2], \"expected\": [2, 1]}\n{\"arguments\": [3, 5], \"expected\": [5, 3]}",
        ...>      input_signature: [
        ...>        %{"type" => %{"name" => "integer"}},
        ...>        %{"type" => %{"name" => "integer"}}
        ...>      ],
        ...>      output_signature: %{"type" => %{"name" => "array", "nested" => %{"name" => "integer"}}}
        ...>    },
        ...>    Codebattle.Languages.meta() |> Map.get("js")
        ...> )
        [checks:
          [
            %{arguments: "1, 2", expected: "[2, 1]", index: 1, error_message: "1, 2"},
            %{arguments: "3, 5", expected: "[5, 3]", index: 2, error_message: "3, 5"}
          ]
        ]

        iex> Codebattle.Generators.CheckerGenerator.inflect(
        ...>    %{
        ...>      asserts: "{\"arguments\": [\"str1\", \"str2\"], \"expected\": {\"str1\": 3, \"str2\": 3}}",
        ...>      input_signature: [
        ...>        %{"type" => %{"name" => "string"}},
        ...>        %{"type" => %{"name" => "string"}}
        ...>      ],
        ...>      output_signature: %{"type" => %{"name" => "hash", "nested" => %{"name" => "integer"}}}
        ...>    },
        ...>    Codebattle.Languages.meta() |> Map.get("js")
        ...> )
        [checks:
          [
            %{
              arguments: "\"str1\", \"str2\"",
              expected: "{\"str1\": 3, \"str2\": 3}",
              index: 1,
              error_message: "\\\"str1\\\", \\\"str2\\\""
            }
          ]
        ]

        iex> Codebattle.Generators.CheckerGenerator.inflect(
        ...>    %{
        ...>      asserts: "{\"arguments\": [[\"str1\", \"str2\"]], \"expected\": {\"str1\": 1, \"str2\": 1}}",
        ...>      input_signature: [
        ...>        %{"argument-name" => "arr", "type" => %{"name" => "array", "nested" => %{"name" => "string"}}},
        ...>      ],
        ...>      output_signature: %{"type" => %{"name" => "hash", "nested" => %{"name" => "integer"}}}
        ...>    },
        ...>    Codebattle.Languages.meta() |> Map.get("ts")
        ...> )
        [checks:
          [
            %{
              arguments: %{
                info: [%{name: "arr1", defining: "arr1: Array<string>", value: "[\"str1\", \"str2\"]"}],
                expression: "arr1"
              },
              expected: %{defining: "expected1: IHash", value: "{\"str1\": 1, \"str2\": 1}"},
              index: 1,
              error_message: "[\\\"str1\\\", \\\"str2\\\"]"
            }
          ]
        ]

        iex> Codebattle.Generators.CheckerGenerator.inflect(
        ...>    %{
        ...>      asserts: "{\"arguments\": [[\"str1\", \"str2\"]], \"expected\": {\"str1\": 1, \"str2\": 1}}",
        ...>      input_signature: [
        ...>        %{"argument-name" => "arr", "type" => %{"name" => "array", "nested" => %{"name" => "string"}}},
        ...>      ],
        ...>      output_signature: %{"type" => %{"name" => "hash", "nested" => %{"name" => "integer"}}}
        ...>    },
        ...>    Codebattle.Languages.meta() |> Map.get("golang")
        ...> )
        [checks:
          [
            %{
              arguments: %{
                info: [%{name: "arr1", defining: "arr1 []string", value: "[]string{\"str1\", \"str2\"}"}],
                expression: "arr1"
              },
              expected: %{defining: "expected1 map[string]int64", value: "map[string]int64{\"str1\": 1, \"str2\": 1}"},
              index: 1,
              error_message: "{\\\"str1\\\", \\\"str2\\\"}"
            }
          ]
        ]
  """

  def inflect(task, meta) do
    asserts = task.asserts |> String.split("\n") |> filter_empty_items()

    Logger.debug(inspect(asserts))

    [
      checks:
        asserts
        |> Enum.map(&Jason.decode!/1)
        |> Enum.with_index(1)
        |> Enum.map(fn {_assert, index} = item ->
          %{
            arguments: get_arguments(item, task, meta),
            expected: get_expected(item, task, meta),
            index: index,
            error_message: get_error_message(item, task, meta)
          }
        end)
    ]
  end

  defp get_arguments(
         {assert, index},
         %{input_signature: input_signature},
         %{checker_meta: %{version: :static}} = meta
       ) do
    info =
      input_signature
      |> Enum.zip(assert["arguments"])
      |> Enum.map(fn {input, value} ->
        %{
          name: get_variable_name(input, index, meta),
          defining: get_defining(input, index, meta),
          value: get_value_expression(input, value, meta)
        }
      end)

    %{
      info: info,
      expression: Enum.map_join(info, ", ", fn %{name: name} -> name end)
    }
  end

  defp get_arguments(
          {assert, _index},
          %{input_signature: input_signature},
          %{checker_meta: checker_meta} = meta
       ) do
    types = Enum.map(input_signature, &extract_type/1)

    types
    |> Enum.zip(assert["arguments"])
    |> Enum.map_join(checker_meta.arguments_delimeter, &get_value(&1, meta))
  end

  defp get_expected(
         {assert, index},
         %{output_signature: signature},
         %{checker_meta: %{version: :static}} = meta
       ) do
    %{
      defining: get_defining(signature, index, meta),
      value: get_value_expression(signature, assert["expected"], meta)
    }
  end

  defp get_expected({assert, _index}, %{output_signature: signature}, meta) do
    get_value({extract_type(signature), assert["expected"]}, meta)
  end

  defp get_error_message({assert, _}, %{input_signature: input_signature}, meta) do
    types = Enum.map(input_signature, &extract_type/1)

    result =
      types
      |> Enum.zip(assert["arguments"])
      |> Enum.map_join(", ", &get_value(&1, meta))

    ~s(#{String.replace(result, "\"", "\\\"")})
  end

  defp get_variable_name(%{"argument-name" => name}, index, _meta), do: "#{name}#{index}"
  defp get_variable_name(_signature, index, _meta), do: ~s(expected#{index})

  defp get_defining(signature, index, %{checker_meta: checker_meta} = meta) do
    name = get_variable_name(signature, index, meta)
    type = TypesGenerator.get_type(signature, meta)

    EEx.eval_string(
      checker_meta.defining_variable_template,
      [name: name, type: type]
    )
  end

  defp get_value_expression(
          %{"type" => %{"nested" => _nested}} = signature,
          value,
          %{checker_meta: checker_meta} = meta
       ) do
    type_name = TypesGenerator.get_type(signature, meta)
    type = extract_type(signature)
    value = get_value({type, value}, meta)

    EEx.eval_string(checker_meta.nested_value_expression_template, value: value, type_name: type_name)
  end

  defp get_value_expression(signature, value, meta) do
    type = extract_type(signature)
    get_value({type, value}, meta)
  end

  defp get_value({%{"name" => "string"}, value}, _meta), do: ~s("#{double_backslashes(value)}")
  defp get_value({%{"name" => "boolean"}, value}, %{checker_meta: checker_meta}),
       do: get_boolean_value(checker_meta.type_templates, value)

  defp get_value({%{"name" => "array", "nested" => nested}, value}, %{checker_meta: checker_meta} = meta) do
    array_values = Enum.map_join(value, ", ", &get_value({nested, &1}, meta))
    EEx.eval_string(checker_meta.type_templates.array, [entries: array_values])
  end

  defp get_value({%{"name" => "hash"} = signature, value}, %{checker_meta: checker_meta} = meta) do
    list = Map.to_list(value)

    if Enum.empty?(list) do
      checker_meta.type_templates.hash_empty
    else
      hash_entries =
        Enum.map_join(list, ", ", fn item -> get_hash_inners(item, signature, meta) end)

      EEx.eval_string(checker_meta.type_templates.hash_value, [entries: hash_entries])
    end
  end

  defp get_value({_, value}, _meta), do: value

  defp get_boolean_value(type_templates, true), do: type_templates.boolean_true

  defp get_boolean_value(type_templates, false), do: type_templates.boolean_false

  defp get_hash_inners({k, v}, %{"nested" => nested}, %{checker_meta: checker_meta} = meta) do
    binding = [
      key: k,
      value: get_value({nested, v}, meta)
    ]

    EEx.eval_string(checker_meta.type_templates.hash_inners, binding)
  end

  defp extract_type(%{"type" => type}), do: type

  defp filter_empty_items(items), do: items |> Enum.filter(&(&1 != ""))

  defp double_backslashes(string) do
    string
    |> String.replace("\\", "\\\\")
    |> String.replace("\n", "\\n")
    |> String.replace("\t", "\\t")
  end

  defp put_types(binding, %{slug: slug} = meta, task)
       when slug in @langs_need_types do
    binding
    |> Keyword.put(:imports, TypesGenerator.get_import(task, meta))
    |> Keyword.put(:types, TypesGenerator.get_interfaces(task, meta))
  end

  defp put_types(binding, _, _), do: binding

  defp get_template_specs(target_dir, %{slug: slug, extension: extension})
       when slug in @langs_need_types do
    Logger.info("Create types for #{slug} language. NAME: types.#{extension}")

    [
      {:new_eex, "checker_template.#{extension}.eex",
       Path.join(target_dir, "checker.#{extension}")},
      {:new_eex, "types_template.#{extension}.eex", Path.join(target_dir, "types.#{extension}")}
    ]
  end

  defp get_template_specs(target_dir, %{slug: "haskell", extension: extension}) do
    [
      {:new_eex, "checker_template.#{extension}.eex",
       Path.join(target_dir, "Checker.#{extension}")}
    ]
  end

  defp get_template_specs(target_dir, %{extension: extension}) do
    [
      {:new_eex, "checker_template.#{extension}.eex",
       Path.join(target_dir, "checker.#{extension}")}
    ]
  end
end
