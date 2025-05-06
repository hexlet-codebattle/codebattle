defmodule Runner.SolutionGenerator do
  @moduledoc false

  alias Runner.TypesGenerator

  @spec call(Runner.Task.t(), Runner.LanguageMeta.t()) :: String.t()
  def call(task, lang_meta) do
    binding =
      %{
        arguments: [],
        expected_type: "",
        return_statement: "",
        typespec: "lal",
        comment: task.comment || "use stdout to debug"
      }
      |> add_arguments(lang_meta, task.input_signature)
      |> add_typespec(lang_meta, task.input_signature)
      |> add_expected(lang_meta, task.output_signature)
      |> add_default_value(lang_meta, task.output_signature)
      |> Map.to_list()

    lang_meta.solution_template
    |> String.trim_trailing("\n")
    |> EEx.eval_string(binding)
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

  defp add_typespec(binding, %{typespec_template: nil}, _input_signature) do
    binding
  end

  defp add_typespec(binding, meta, input_signature) do
    %{argument: argument, delimiter: delimiter} = meta.typespec_template

    typespec =
      Enum.map_join(
        input_signature,
        delimiter,
        &EEx.eval_string(argument,
          name: &1.argument_name,
          type: TypesGenerator.call(&1.type, meta)
        )
      )

    Map.put(binding, :typespec, typespec)
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

  defp add_default_value(
         binding,
         meta,
         output_signature
       ) do
    value = get_default_value(meta.default_values, output_signature.type)

    Map.put(binding, :default_value, value)
  end

  defp get_default_value(default_values, %{name: name, nested: nested}) do
    default = Map.get(default_values, name)
    EEx.eval_string(default, value: get_default_value(default_values, nested))
  end

  defp get_default_value(default_values, %{name: name}), do: Map.get(default_values, name)
end
