defmodule Codebattle.Generators.TypesGenerator do
  @moduledoc ~S"""
      iex> Codebattle.Generators.TypesGenerator.get_import(
      ...>    %{
      ...>      input_signature: [
      ...>        %{"argument-name" => "obj1", "type" => %{"name" => "hash", "nested" => %{"name" => "string"}}},
      ...>        %{"argument-name" => "arr1", "type" => %{"name" => "array", "nested" => %{"name" => "integer"}}},
      ...>        %{"argument-name" => "value", "type" => %{"name" => "integer"}},
      ...>        %{"argument-name" => "obj2", "type" => %{"name" => "hash", "nested" => %{"name" => "integer"}}},
      ...>      ],
      ...>      output_signature: %{"type" => %{"name" => "hash", "nested" => %{"name" => "float"}}}
      ...>    },
      ...>    Codebattle.Languages.meta() |> Map.get("ts")
      ...> )
      "import * as _ from \"lodash\";\nimport {Obj1, Obj2, IHash} from \"./types\";\n\n"
  """

  def get_import(
    %{input_signature: input_signature, output_signature: output_signature},
    meta
  ) do

    hashs = get_hashs(input_signature, output_signature)
    interfaces = get_interfaces_info(hashs, meta, [])
    get_import_expression(interfaces, meta)
  end

  def get_interfaces(
    %{input_signature: input_signature, output_signature: output_signature},
    meta
  ) do

    hashs = get_hashs(input_signature, output_signature)
    get_interfaces_info(hashs, meta, [])
  end

  def get_interface_name(%{"argument-name" => name}, "ts") do
    name
    |> case_words()
    |> Enum.map_join(&(String.capitalize(&1)))
  end
  def get_interface_name(_, "ts"), do: "IHash"

  def get_type(
    %{"type" => %{"name" => name, "nested" => nested}} = signature,
    %{slug: "ts" = slug, types: lang_types} = meta
  ) do

    if is_hash(signature) do
      get_interface_name(signature, slug)
    else
      type = Map.get(lang_types, name)
      EEx.eval_string(type, [inner_type: get_type(%{"type" => nested}, meta)])
    end
  end
  def get_type(%{"type" => %{"name" => name, "nested" => nested}}, %{types: lang_types} = meta) do
    type = Map.get(lang_types, name)
    EEx.eval_string(type, [inner_type: get_type(%{"type" => nested}, meta)])
  end
  def get_type(%{"type" => %{"name" => name}}, %{types: lang_types}), do: Map.get(lang_types, name)

  defp get_interfaces_info(hashs, _meta, acc) when hashs == [], do: acc
  defp get_interfaces_info(
    [%{"type" => %{"nested" => nested}} = interface | rest],
    %{slug: lang} = meta,
    acc
  ) do

    formatted_name = get_interface_name(interface, lang)
    value_type = get_type(%{"type" => nested}, meta)
    new_acc = Enum.concat(acc, [%{name: formatted_name, value_type: value_type}])

    get_interfaces_info(rest, meta, new_acc)
  end

  defp get_hashs(nil, nil), do: []
  defp get_hashs(nil, %{"type" => %{"name" => "hash"}} = output_signature), do: output_signature
  defp get_hashs(input_signature, nil), do: Enum.filter(input_signature, &is_hash/1)
  defp get_hashs(input_signature, output_signature), do: Enum.filter(input_signature ++ [output_signature], &is_hash/1)

  defp get_interface_export("ts", %{name: name, value_type: value}) do
    "export interface #{name} {\n\t[key: string]: #{value};\n}\n\n"
  end

  defp get_import_expression(types, %{slug: "ts"}) when types == [] do
    "import * as _ from \"lodash\";\n"
  end
  defp get_import_expression(types, %{slug: "ts"}) do
    names = Enum.map(types, fn %{name: name} -> name end)
    "import * as _ from \"lodash\";\nimport {#{Enum.join(names, ", ")}} from \"./types\";\n\n"
  end

  defp is_hash(%{"type" => %{"name" => "hash"}}), do: true
  defp is_hash(_), do: false

  defp case_words(str) do
    String.split(str, ~r{_})
  end
end
