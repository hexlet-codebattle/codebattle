defmodule Codebattle.CodeCheck.CheckerStatus do
  @moduledoc "Parse container output for representing check status of solution"

  require Logger
  alias Codebattle.CodeCheck.CheckResult

  @doc """
        iex> Codebattle.CodeCheck.CheckerStatus.get_check_result(
        ...>    ~s({"status": "error", "result": "sdf"}),
        ...>    %{check_code: "-1", lang: %{slug: "js"}}
        ...> )
        %Codebattle.CodeCheck.CheckResult{
          asserts_count: 0,
          success_count: 0,
          status: :error,
          output: ~s({"status": "error", "result": "sdf"}),
          result: ~s({"status": "error", "result": "sdf"})
        }

        iex> Codebattle.CodeCheck.CheckerStatus.get_check_result(
        ...>      ~s({"status": "ok", "result": "__code-1__"}),
        ...>      %{check_code: "-1", lang: %{slug: "js"}}
        ...> )
        %Codebattle.CodeCheck.CheckResult{
          asserts_count: 0,
          success_count: 0,
          status: :ok,
          output: ~s({"status": "ok", "result": "__code-1__"}),
          result: ~s({"status": "ok", "result": "__code-1__"})
        }

        iex> Codebattle.CodeCheck.CheckerStatus.get_check_result(
        ...>      ~s({"status": "failure", "result": "0", "arguments": [0]}
        ...>{"status": "success", "result": "1"}
        ...>), %{check_code: "-1", lang: %{slug: "js"}}
        ...> )
        %Codebattle.CodeCheck.CheckResult{
          asserts: [~s({"status": "success", "result": "1"}), ~s({"status": "failure", "result": "0", "arguments": [0]})],
          asserts_count: 2,
          success_count: 1,
          status: :failure,
          output: ~s({"status": "failure", "result": "0", "arguments": [0]}),
          result: ~s({"status": "failure", "result": "0", "arguments": [0]})
        }

  """

  def get_check_result(container_output, %{check_code: check_code, lang: lang}) do
    case Regex.scan(~r/{\"status\":.+}/, container_output) do
      [] ->
        result =
          Jason.encode!(%{
            status: "error",
            result: "Something went wrong! Please, write to dev team in our Slack"
          })

        %CheckResult{status: :error, result: result, output: container_output}

      json_result ->
        [last_message] = List.last(json_result)
        output_code = Regex.named_captures(~r/__code(?<code>.+)__/, last_message)["code"]

        case output_code do
          ^check_code ->
            %CheckResult{
              status: :ok,
              result: last_message,
              output: reset_statuses(container_output, List.flatten(json_result))
            }

          _ ->
            get_error_status(last_message, container_output, lang)
        end
    end
  end

  def get_compile_check_result(container_output, %{slug: "golang"}) do
    case Regex.run(~r/\.\/check\/solution\.go:.+/, container_output) do
      nil ->
        :ok

      result ->
        json_result =
          Jason.encode!(%{
            status: "error",
            result: List.first(result)
          })

        {:error, json_result, container_output}
    end
  end

  def get_compile_check_result(container_output, %{slug: "cpp"}) do
    case Regex.run(~r/\.\/check\/solution\.cpp:.+/, container_output) do
      nil ->
        :ok

      result ->
        json_result =
          Jason.encode!(%{
            status: "error",
            result: List.first(result)
          })

        {:error, json_result, container_output}
    end
  end

  defp get_error_status(json_result, container_output, _meta) do
    case Regex.scan(~r/{"status":.*"error".+}/, container_output) do
      [] ->
        failure_list = Regex.scan(~r/{"status":.*"failure".+}/, container_output)
        success_list = Regex.scan(~r/{"status":.*"success".+}/, container_output)
        failure_count = length(failure_list)
        success_count = length(success_list)

        [first_failure_json] = List.first(failure_list)
        asserts = extract_jsons(success_list) ++ extract_jsons(failure_list)

        new_container_output =
          container_output
          |> cut_output_by_delimiter(first_failure_json)
          |> reset_statuses(success_list)

        %CheckResult{
          status: :failure,
          result: first_failure_json,
          output: new_container_output,
          asserts: asserts,
          success_count: success_count,
          asserts_count: failure_count + success_count
        }

      [_] ->
        %CheckResult{status: :error, result: json_result, output: container_output}
    end
  end

  defp cut_output_by_delimiter(container_output, delimiter) do
    result =
      container_output
      |> String.split(delimiter)
      |> List.first()

    result <> delimiter
  end

  defp reset_statuses(container_output, list) do
    Enum.reduce(list, container_output, fn str, output ->
      String.replace(output, "#{str}\n", "", global: false)
    end)
  end

  defp extract_jsons(list), do: Enum.map(list, &List.first/1)
end
