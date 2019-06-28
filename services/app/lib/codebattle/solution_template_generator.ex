defmodule Codebattle.SolutionTemplateGenerator do
  @moduledoc false

  @type_langs ["haskell", "python"]

  # require Logger

  def get_solution(%{slug: lang} = meta, task) do
    meta
    |> add_input_to_template(lang, Map.get(task, :input_signature, []))
    |> add_output_to_template(lang, Map.get(task, :output_signature, %{}))
    |> Map.get(:solution_template)
    |> clean()
  end
  def get_solution(%{solution_template: template}, _task), do: clean(template)

  defp add_input_to_template(meta, _lang, nil), do: meta
  defp add_input_to_template(meta, _lang, input) when input == [], do: meta
  defp add_input_to_template(%{types: lang_types} = meta, lang, input) when lang in @type_langs do
    specs = Enum.map_join(input, ", ", fn %{"argument-name" => name, "type" => type} ->
      arg_type = get_type(type, lang_types)
      get_input_spec(name, lang, arg_type)
    end)

    update_template(meta, specs)
  end
  defp add_input_to_template(meta, lang, input) when lang not in ["perl"] do
    input_args_str = get_args_str(meta, lang, input)
    update_template(meta, input_args_str)
  end
  defp add_input_to_template(meta, _lang, _input), do: meta

  defp get_input_spec(name, "python", arg_type), do: "#{name}: #{arg_type}"
  defp get_input_spec(_name, "haskell", arg_type), do: arg_type

  defp get_args_str(_meta, "php", input) do
    Enum.map_join(input, ", ", &("$#{&1["argument-name"]}"))
  end
  defp get_args_str(_meta, _lang, input) do
    Enum.map_join(input, ", ", &(&1["argument-name"]))
  end

  defp add_output_to_template(meta, _lang, nil), do: meta
  defp add_output_to_template(meta, _lang, output) when map_size(output) == 0, do: meta
  defp add_output_to_template(%{
    types: lang_types
  } = meta, lang, %{"type" => type}) when lang in @type_langs do
    output_type = " -> #{get_type(type, lang_types)}"
    update_template(meta, output_type)
  end
  defp add_output_to_template(%{
    return_template: return_template,
    default_values: default_values
  } = meta, lang, %{"type" => type}) when lang not in ["perl"] do

    value = get_default_value(default_values, type)
    return_statement = String.replace(return_template, "\0", value)
    update_template(meta, return_statement)
  end
  defp add_output_to_template(meta, _default_values, _output), do: meta

  defp get_type(%{"name" => name, "nested" => nested}, lang_types) do
    type = Map.get(lang_types, name)
    String.replace(type, "\0", get_type(nested, lang_types))
  end
  defp get_type(%{"name" => name}, lang_types), do: Map.get(lang_types, name)

  defp get_default_value(default_values, %{"name" => name, "nested" => nested}) do
    default = Map.get(default_values, name)
    String.replace(default, "\0", get_default_value(default_values, nested))
  end
  defp get_default_value(default_values, %{"name" => name}), do: Map.get(default_values, name)

  defp update_template(meta, str) do
    Map.update!(meta, :solution_template, fn t ->
      String.replace(t, "\0", str, global: false)
    end)
  end

  defp clean(template), do: String.replace(template, "\0", "")
end
