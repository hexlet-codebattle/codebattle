defmodule Codebattle.CodeCheck.TestGenerator do
  @moduledoc false

  require Logger

  def create(%{extension: extension, slug: slug} = meta, task, target_dir, hash_sum) do
    binding = inflect(task, meta)
    binding = Keyword.put(binding, :hash_sum, hash_sum)

    source_dir = "/dockers/#{slug}"
    Logger.info("Create checker for #{slug} language. NAME: checker.#{extension}, TASK: #{inspect(task)}")
    Mix.Phoenix.copy_from(["."], source_dir, binding, [
      {:new_eex, "checker_template.#{extension}.eex", Path.join(target_dir, "checker.#{extension}")}
    ])
  end

  @doc ~S"""

        iex> Codebattle.CodeCheck.TestGenerator.inflect(
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
        [checks: [{"1, 2", "[2, 1]", "result1"}, {"3, 5", "[5, 3]", "result2"}]]

        iex> Codebattle.CodeCheck.TestGenerator.inflect(
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
        [checks: [{"\"str1\", \"str2\"", "{\"str1\": 3, \"str2\": 3}", "result1"}]]
  """

  def inflect(task, %{slug: slug}) do
    asserts = String.split(task.asserts, "\n")
    [
      checks: asserts
                |> Enum.map(&Jason.decode!/1)
                |> Enum.with_index(1)
                |> Enum.map(fn item -> {
                  get_arguments(item, task, slug),
                  get_expected(item, task, slug),
                  get_var_name(item, slug)
                } end)
    ]
  end

  defp get_arguments({assert, _index}, %{input_signature: input_signature}, slug) do
    types = Enum.map(input_signature, &get_type/1)

    types
    |> Enum.zip(assert["arguments"])
    |> Enum.map(&get_value(&1, slug))
    |> Enum.join(", ")
  end

  defp get_expected({assert, _index}, %{output_signature: output_signature}, slug) do
    get_value({get_type(output_signature), assert["expected"]}, slug)
  end

  defp get_var_name({_, index}, "js") do
    "result#{index}"
  end

  defp get_value({%{"name" => "string"}, value}, "js"), do: "\"#{value}\""
  defp get_value({%{"name" => "array", "nested" => nested}, value}, "js") do
    array_values = Enum.map_join(value, ", ", &get_value({nested, &1}, "js"))
    "[#{array_values}]"
  end
  defp get_value({%{"name" => "hash", "nested" => nested}, value}, "js") do
    list = Map.to_list(value)
    hash_entries = Enum.map_join(list, ", ", fn {k, v} -> "\"#{k}\": #{get_value({nested, v}, "js")}"end)
    "{#{hash_entries}}"
  end
  defp get_value({_, value}, "js"), do: value

  defp get_type(%{"type" => type}), do: type
end
