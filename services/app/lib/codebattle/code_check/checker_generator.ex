defmodule Codebattle.CodeCheck.CheckerGenerator do
  @moduledoc false

  alias Codebattle.CodeCheck.TypesGenerator

  def call(%{lang_meta: %{checker_version: 2}} = token) do
    Codebattle.CodeCheck.CheckerGenerator.V2.call(token)
  end

  def call(%{lang_meta: meta, task: task, seed: seed}) do
    binding =
      [check_code: "\"__seed:#{seed}__\""]
      |> Keyword.put(:checks, get_task_binding(task, meta))

    :codebattle
    |> Application.app_dir("priv/templates/")
    |> Path.join("#{meta.slug}.eex")
    |> EEx.eval_file(binding)
  end

  def get_task_binding(task, meta) do
    task.asserts
    |> Enum.with_index(1)
    |> Enum.map(fn {assert, index} = item ->
      %{
        arguments: get_arguments(item, task, meta),
        expected: get_expected(item, task, meta),
        index: index,
        args_string: get_arguments_string(assert)
      }
    end)
  end

  defp get_arguments_string(assert) do
    Enum.map_join(assert.arguments, ", ", &inspect/1)
  end

  defp get_arguments(
         {assert, index},
         %{input_signature: input_signature},
         %{checker_meta: %{version: :static}} = meta
       ) do
    info =
      input_signature
      |> Enum.zip(assert.arguments)
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
    |> Enum.zip(assert.arguments)
    |> Enum.map_join(checker_meta.arguments_delimiter, &get_value(&1, meta))
  end

  defp get_expected(
         {assert, index},
         %{output_signature: signature},
         %{checker_meta: %{version: :static}} = meta
       ) do
    %{
      defining: get_defining(signature, index, meta),
      value: get_value_expression(signature, assert.expected, meta)
    }
  end

  defp get_expected({assert, _index}, %{output_signature: signature}, meta) do
    get_value({extract_type(signature), assert.expected}, meta)
  end

  defp get_variable_name(%{argument_name: name}, index, _meta), do: "#{name}#{index}"
  defp get_variable_name(_signature, index, _meta), do: ~s(expected#{index})

  defp get_defining(signature, index, %{checker_meta: checker_meta} = meta) do
    name = get_variable_name(signature, index, meta)
    type = TypesGenerator.call(signature.type, meta)

    EEx.eval_string(
      checker_meta.defining_variable_template,
      name: name,
      type: type
    )
  end

  defp get_value_expression(
         %{type: %{nested: _nested}} = signature,
         value,
         %{checker_meta: checker_meta} = meta
       ) do
    type_name = TypesGenerator.call(signature.type, meta)
    type = extract_type(signature)
    value = get_value({type, value}, meta)

    EEx.eval_string(checker_meta.nested_value_expression_template,
      value: value,
      type_name: type_name
    )
  end

  defp get_value_expression(signature, value, meta) do
    type = extract_type(signature)
    get_value({type, value}, meta)
  end

  defp get_value({%{name: "string"}, value}, meta),
    do: ~s("#{double_backslashes(value, meta)}")

  defp get_value({%{name: "boolean"}, value}, %{checker_meta: checker_meta}),
    do: get_boolean_value(checker_meta.type_templates, value)

  defp get_value(
         {%{name: "array", nested: nested}, value},
         %{checker_meta: checker_meta} = meta
       ) do
    inner_type = TypesGenerator.call(nested, meta)
    array_values = Enum.map_join(value, ", ", &get_value({nested, &1}, meta))

    EEx.eval_string(checker_meta.type_templates.array,
      entries: array_values,
      inner_type: inner_type
    )
  end

  defp get_value({%{name: "hash"} = signature, value}, %{checker_meta: checker_meta} = meta) do
    list = Map.to_list(value)

    if Enum.empty?(list) do
      checker_meta.type_templates.hash_empty
    else
      hash_entries =
        Enum.map_join(list, ", ", fn item -> get_hash_inners(item, signature, meta) end)

      EEx.eval_string(checker_meta.type_templates.hash_value, entries: hash_entries)
    end
  end

  defp get_value({_, value}, _meta), do: value

  defp get_boolean_value(type_templates, true), do: type_templates.boolean_true

  defp get_boolean_value(type_templates, false), do: type_templates.boolean_false

  defp get_hash_inners({k, v}, %{nested: nested}, %{checker_meta: checker_meta} = meta) do
    binding = [key: k, value: get_value({nested, v}, meta)]
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
