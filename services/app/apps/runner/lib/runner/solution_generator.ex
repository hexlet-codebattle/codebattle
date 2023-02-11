defmodule Runner.SolutionGenerator do
  @moduledoc false

  alias Runner.TypesGenerator

  @spec call(Runner.LanguageMeta.t(), Runner.Task.t()) :: String.t()
  def call(lang_meta, task) do
    binding =
      %{arguments: [], expected_type: "", return_statement: ""}
      |> add_arguments(lang_meta, task.input_signature)
      |> add_expected(lang_meta, task.output_signature)
      |> add_return_statement(lang_meta, task.output_signature)
      |> Map.to_list()

    EEx.eval_string(lang_meta.solution_template, binding)
  end

  defp add_arguments(binding, meta, input_signature) do
    %{argument: argument, delimiter: delimiter} = meta.arguments_template

    arguments =
      Enum.map_join(
        input_signature,
        delimiter,
        &EEx.eval_string(argument,
          name: &1.argument_name,
          type: TypesGenerator.call(&1.type, meta)
        )
      )

    Map.put(binding, :arguments, arguments)
  end

  defp add_expected(
         binding,
         %{expected_template: expected_template} = meta,
         output_signature
       )
       when is_binary(expected_template) do
    output_type = TypesGenerator.call(output_signature.type, meta)
    expected = EEx.eval_string(expected_template, type: output_type)

    Map.put(binding, :expected, expected)
  end

  defp add_expected(binding, _meta, _output_signature), do: binding

  defp add_return_statement(
         binding,
         %{return_template: return_template} = meta,
         output_signature
       )
       when is_binary(return_template) do
    value = get_default_value(meta.default_values, output_signature.type)
    return_statement = EEx.eval_string(return_template, default_value: value)
    Map.put(binding, :return_statement, return_statement)
  end

  defp add_return_statement(binding, _meta, _), do: binding

  defp get_default_value(default_values, %{name: name, nested: nested}) do
    default = Map.get(default_values, name)
    EEx.eval_string(default, value: get_default_value(default_values, nested))
  end

  defp get_default_value(default_values, %{name: name}), do: Map.get(default_values, name)
end
