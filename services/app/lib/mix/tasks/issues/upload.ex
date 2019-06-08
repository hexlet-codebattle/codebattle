defmodule Mix.Tasks.Issues.Upload do
  @moduledoc false

  use Mix.Task

  require Logger

  alias Codebattle.{Repo, Task}

  @shortdoc "Upload tasks from /asserts to database"

  @issues_dir "#{Application.get_env(:codebattle, Mix.Tasks.Issues)[:issues_dir]}/issues"

  def run([]) do
    run([@issues_dir])
  end

  def run([path]) do
    {:ok, _started} = Application.ensure_all_started(:codebattle)

    issue_names =
      path
      |> File.ls!()
      |> Enum.map(fn file_name ->
        file_name
        |> String.split(".")
        |> List.first()
      end)
      |> MapSet.new()
      |> Enum.filter(fn x -> String.length(x) > 0 end)

    Enum.each(issue_names, fn issue_name ->
      asserts = File.read!(Path.join(path, "#{issue_name}.jsons"))
      issue_info = YamlElixir.read_from_file!(Path.join(path, "#{issue_name}.yml"))
      signature = Map.get(issue_info, "signature")

      input =
        case Map.get(signature, "input") do
          nil -> "nil"

          input_args -> Enum.map_join(input_args, "/", &parse_arg/1)
        end

      output =
        case Map.get(signature, "output") do
          nil -> "nil"

          output_arg -> parse_arg(output_arg)
        end

      changeset =
        Task.changeset(%Task{}, %{
          name: issue_name,
          description: Map.get(issue_info, "description"),
          level: Map.get(issue_info, "level"),
          input: input,
          output: output,
          asserts: asserts
        })

      case Repo.insert(changeset) do
        {:ok, _} ->
          IO.puts(".")

        _ ->
          true
      end
    end)
  end

  defp parse_arg(%{"argument-name" => name, "type" => type}) do
    "#{name}:#{parse_type(type)}"
  end
  defp parse_arg(%{"type" => type}), do: "nil:#{parse_type(type)}"

  defp parse_type(%{"name" => name, "nested" => %{"type": nested_type}}) do
    "#{name}[#{parse_type(nested_type)}]"
  end
  defp parse_type(%{"name" => name}), do: name
end
