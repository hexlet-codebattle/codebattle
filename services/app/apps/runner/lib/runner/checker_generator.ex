defmodule Runner.CheckerGenerator do
  @moduledoc false

  alias Runner.TypesGenerator

  @spec call(Runner.Task.t(), Runner.LanguageMeta.t(), String.t()) :: String.t()
  def call(task, lang_meta = %{checker_version: 2}, _seed) do
    Runner.CheckerGenerator.V2.call(task, lang_meta)
  end

  def call(task, lang_meta, seed) do
    binding =
      [check_code: "\"__seed:#{seed}__\""]
      |> Keyword.put(:checks, get_task_binding(task, lang_meta))

    :runner
    |> Application.app_dir("priv/templates/")
    |> Path.join("#{lang_meta.slug}.eex")
    |> EEx.eval_file(binding)
  end

  defp get_task_binding(task, lang_meta) do
    task.asserts
    |> Enum.with_index(1)
    |> Enum.map(fn {assert, index} = item ->
      %{
        arguments: get_arguments(item, task, lang_meta),
        expected: get_expected(item, task, lang_meta),
        index: index,
        args_string: get_arguments_string(assert)
      }
    end)
  end

  defp get_arguments_string(assert_item) do
    assert_item.arguments
    |> Enum.map_join(", ", &Jason.encode!/1)
    |> Jason.encode!()
  end

  defp get_arguments(
         {assert, index},
         %{input_signature: input_signature},
         lang_meta = %{checker_meta: %{version: :static}}
       ) do
    info =
      input_signature
      |> Enum.zip(assert.arguments)
      |> Enum.map(fn {input, value} ->
        %{
          name: get_variable_name(input, index, lang_meta),
          defining: get_defining(input, index, lang_meta),
          value: get_value_expression(input, value, lang_meta)
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
         lang_meta = %{checker_meta: checker_meta}
       ) do
    types = Enum.map(input_signature, &extract_type/1)

    types
    |> Enum.zip(assert.arguments)
    |> Enum.map_join(checker_meta.arguments_delimiter, &get_value(&1, lang_meta))
  end

  defp get_expected(
         {assert, index},
         %{output_signature: signature},
         lang_meta = %{checker_meta: %{version: :static}}
       ) do
    %{
      defining: get_defining(signature, index, lang_meta),
      value: get_value_expression(signature, assert.expected, lang_meta)
    }
  end

  defp get_expected({assert, _index}, %{output_signature: signature}, lang_meta) do
    get_value({extract_type(signature), assert.expected}, lang_meta)
  end

  defp get_variable_name(%{argument_name: name}, index, _meta), do: "#{name}#{index}"
  defp get_variable_name(_signature, index, _meta), do: ~s(expected#{index})

  defp get_defining(signature, index, lang_meta = %{checker_meta: checker_meta}) do
    name = get_variable_name(signature, index, lang_meta)
    type = TypesGenerator.call(signature.type, lang_meta)

    EEx.eval_string(
      checker_meta.defining_variable_template,
      name: name,
      type: type
    )
  end

  defp get_value_expression(
         signature = %{type: %{nested: _nested}},
         value,
         lang_meta = %{checker_meta: checker_meta}
       ) do
    type_name = TypesGenerator.call(signature.type, lang_meta)
    type = extract_type(signature)
    value = get_value({type, value}, lang_meta)

    EEx.eval_string(checker_meta.nested_value_expression_template,
      value: value,
      type_name: type_name
    )
  end

  defp get_value_expression(signature, value, lang_meta) do
    type = extract_type(signature)
    get_value({type, value}, lang_meta)
  end

  defp get_value({%{name: "string"}, value}, lang_meta),
    do: ~s("#{double_backslashes(value, lang_meta)}")

  defp get_value({%{name: "boolean"}, value}, %{checker_meta: checker_meta}),
    do: get_boolean_value(checker_meta.type_templates, value)

  defp get_value(
         {%{name: "array", nested: nested}, value},
         lang_meta = %{checker_meta: checker_meta}
       ) do
    inner_type = TypesGenerator.call(nested, lang_meta)
    array_values = Enum.map_join(value, ", ", &get_value({nested, &1}, lang_meta))

    EEx.eval_string(checker_meta.type_templates.array,
      entries: array_values,
      inner_type: inner_type
    )
  end

  defp get_value({signature = %{name: "hash"}, value}, lang_meta = %{checker_meta: checker_meta}) do
    list = Map.to_list(value)

    if Enum.empty?(list) do
      checker_meta.type_templates.hash_empty
    else
      hash_entries =
        Enum.map_join(list, ", ", fn item -> get_hash_inners(item, signature, lang_meta) end)

      EEx.eval_string(checker_meta.type_templates.hash_value, entries: hash_entries)
    end
  end

  defp get_value({_, value}, _meta), do: value

  defp get_boolean_value(type_templates, true), do: type_templates.boolean_true

  defp get_boolean_value(type_templates, false), do: type_templates.boolean_false

  defp get_hash_inners({k, v}, %{nested: nested}, lang_meta = %{checker_meta: checker_meta}) do
    binding = [key: k, value: get_value({nested, v}, lang_meta)]
    EEx.eval_string(checker_meta.type_templates.hash_inners, binding)
  end

  defp extract_type(%{type: type}), do: type

  defp double_backslashes(string, %{slug: "dart"}) do
    string
    |> String.replace("\\", "\\\\")
    |> String.replace("\n", "\\n")
    |> String.replace("\t", "\\t")
    |> String.replace("\"", "\\\"")
    |> String.replace("$", "\\$")
  end

  defp double_backslashes(string, _meta) do
    string
    |> String.replace("\\", "\\\\")
    |> String.replace("\n", "\\n")
    |> String.replace("\t", "\\t")
    |> String.replace("\"", "\\\"")
  end
end
