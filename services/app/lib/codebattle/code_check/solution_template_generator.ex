defmodule Codebattle.CodeCheck.SolutionTemplateGenerator do
  @moduledoc false

  @static_langs ["ts"]

  alias Codebattle.CodeCheck.TypesGenerator

  def call(%{solution_template: template} = meta, task) do
    bindings =
      []
      |> add_input_spec(meta, Map.get(task, :input_signature, []))
      |> add_output_spec(meta, Map.get(task, :output_signature, %{}))
      |> add_types(meta, task)

    EEx.eval_string(template, bindings)
  end

  defp add_input_spec(bindings, _meta, nil), do: add_empty_input(bindings)
  defp add_input_spec(bindings, _meta, input) when input == [], do: add_empty_input(bindings)

  defp add_input_spec(bindings, meta, input) do
    %{argument: template, delimiter: delimiter} = meta.arguments_template

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

  # defp add_input_spec(bindings, _meta, _input), do: add_empty_input(bindings)

  defp add_output_spec(bindings, _meta, nil), do: add_empty_output(bindings)

  defp add_output_spec(bindings, _meta, output) when map_size(output) == 0,
    do: add_empty_output(bindings)

  defp add_output_spec(
         bindings,
         %{solution_version: :typed} = meta,
         output_signature
       ) do
    output_type = TypesGenerator.get_type(output_signature, meta)
    IO.inspect(meta.slug)
    IO.inspect(meta.expected_template)
    IO.inspect(output_type)
    expected = EEx.eval_string(meta.expected_template, type: output_type)

    Keyword.put(bindings, :expected, expected)
  end

  defp add_output_spec(bindings, meta, %{type: type}) do
    value = get_default_value(meta.default_values, type)
    return_statement = EEx.eval_string(meta.return_template, default_value: value)
    Keyword.put(bindings, :return_statement, return_statement)
  end

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
