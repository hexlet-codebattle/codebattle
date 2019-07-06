defmodule Codebattle.Generators.CheckerGenerator do
  @moduledoc false

  require Logger

  alias Codebattle.Generators.TypesGenerator

  @langs_need_types ["ts"]

  def create(%{extension: extension, slug: slug} = meta, task, target_dir, hash_sum) do
    binding = inflect(task, meta)
    binding = binding
              |> Keyword.put(:hash_sum, hash_sum)
              |> put_types(meta, task)

    source_dir = "/dockers/#{slug}"
    Logger.info("Create checker for #{slug} language. NAME: checker.#{extension}, TASK: #{inspect(task)}")
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
        ...>    %{slug: "js"}
        ...> )
        [checks:
          [
            %{arguments: "1, 2", expected: "[2, 1]", index: 1, error_message: "error"},
            %{arguments: "3, 5", expected: "[5, 3]", index: 2, error_message: "error"}
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
        ...>    %{slug: "js"}
        ...> )
        [checks:
          [
            %{arguments: "\"str1\", \"str2\"", expected: "{\"str1\": 3, \"str2\": 3}", index: 1, error_message: "error"}
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
                expretion: "arr1"
              },
              expected: %{defining: "expected1: IHash", value: "{\"str1\": 1, \"str2\": 1}"},
              index: 1,
              error_message: "\"error\""
            }
          ]
        ]
  """

  def inflect(task, meta) do
    asserts = String.split(task.asserts, "\n")
    [
      checks: asserts
                |> Enum.map(&Jason.decode!/1)
                |> Enum.with_index(1)
                |> Enum.map(fn {_assert, index} = item -> %{
                  arguments: get_arguments(item, task, meta),
                  expected: get_expected(item, task, meta),
                  index: index,
                  error_message: "\"error\""
                } end)
    ]
  end

  defp get_arguments({assert, index}, %{input_signature: input_signature}, %{slug: "ts"} = meta) do
    info = input_signature
           |> Enum.zip(assert["arguments"])
           |> Enum.map(fn {input, value} ->
             type = extract_type(input)
             %{
               name: get_name(input, index, meta),
               defining: get_defining(input, index, meta),
               value: get_value({type, value}, meta),
             }
           end)

    %{
      info: info,
      expretion: Enum.map_join(info, ", ", fn %{name: name} -> name end)
    }
  end
  defp get_arguments({assert, _index}, %{input_signature: input_signature}, %{slug: "js"}) do
    types = Enum.map(input_signature, &extract_type/1)

    types
    |> Enum.zip(assert["arguments"])
    |> Enum.map(&get_value(&1, "js"))
    |> Enum.join(", ")
  end

  defp get_expected({assert, _index}, %{output_signature: signature}, %{slug: "js"}) do
    get_value({extract_type(signature), assert["expected"]}, "js")
  end
  defp get_expected({assert, index}, %{output_signature: %{"type" => type} = signature}, %{slug: "ts"} = meta) do
    type_name = TypesGenerator.get_type(signature, meta)
    %{
      defining: "expected#{index}: #{type_name}",
      value: get_value({type, assert["expected"]}, "ts")
    }
  end

  defp get_name(%{"argument-name" => name}, index, _meta), do: "#{name}#{index}"

  defp get_defining(signature, index, meta) do
    type_name = TypesGenerator.get_type(signature, meta)
    "#{get_name(signature, index, meta)}: #{type_name}"
  end

  defp get_value({%{"name" => "string"}, value}, _meta), do: "\"#{value}\""
  defp get_value({%{"name" => "array", "nested" => nested}, value}, meta) do
    array_values = Enum.map_join(value, ", ", &get_value({nested, &1}, meta))
    "[#{array_values}]"
  end
  defp get_value({%{"name" => "hash", "nested" => nested}, value}, meta) do
    list = Map.to_list(value)
    hash_entries = Enum.map_join(list, ", ", fn {k, v} -> "\"#{k}\": #{get_value({nested, v}, meta)}"end)
    "{#{hash_entries}}"
  end
  defp get_value({_, value}, _meta), do: value

  defp extract_type(%{"type" => type}), do: type

  defp put_types(binding, %{slug: slug} = meta, task) when slug in @langs_need_types do
    binding
      |> Keyword.put(:imports, TypesGenerator.get_import(task, meta))
      |> Keyword.put(:types, TypesGenerator.get_interfaces(task, meta))
  end
  defp put_types(binding, _, _), do: binding

  defp get_template_specs(target_dir, %{slug: slug, extension: extension}) when slug in @langs_need_types do
    Logger.info("Create types for #{slug} language. NAME: types.#{extension}")
    [
      {:new_eex, "checker_template.#{extension}.eex", Path.join(target_dir, "checker.#{extension}")},
      {:new_eex, "types_template.#{extension}.eex", Path.join(target_dir, "types.#{extension}")}
    ]
  end
  defp get_template_specs(target_dir, %{slug: slug, extension: extension}) do
    [
      {:new_eex, "checker_template.#{extension}.eex", Path.join(target_dir, "checker.#{extension}")}
    ]
  end
end
