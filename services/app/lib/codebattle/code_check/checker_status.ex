defmodule Codebattle.CodeCheck.CheckerStatus do
  @moduledoc false

  require Logger

  @doc """
        iex> Codebattle.CodeCheck.CheckerStatus.get_check_result(
        ...>    ~s({"status": "error", "result": "sdf"}),
        ...>    "-1",
        ...>    %{slug: "js"}
        ...> )
        {
          :error,
          ~s({"status": "error", "result": "sdf"}),
          ~s({"status": "error", "result": "sdf"})
        }

        iex> Codebattle.CodeCheck.CheckerStatus.get_check_result(
        ...>      ~s({"status": "ok", "result": "__code-1__"}),
        ...>      "-1",
        ...>      %{slug: "js"}
        ...> )
        {
          :ok, ~s({"status": "ok", "result": "__code-1__"}), ~s({"status": "ok", "result": "__code-1__"})
        }

        iex> Codebattle.CodeCheck.CheckerStatus.get_check_result(
        ...>      ~s({"status": "failure", "result": "0", "arguments": [0]}
        ...>{"status": "success", "result": "1"}
        ...>),
        ...>      "-1",
        ...>      %{slug: "js"}
        ...> )
        {
          :failure,
          ~s({"status": "failure", "result": "0", "arguments": [0]}),
          50,
          [[~s({"status": "failure", "result": "0", "arguments": [0]})], [~s({"status": "success", "result": "1"})]],
          ""
        }

  """

  def get_check_result(container_output, check_code, meta) do
      case Regex.scan(~r/{\"status\":.+}/, container_output) do
        [] ->
          result = Jason.encode!(%{
            status: "error",
            result: "Something went wrong! Please, write to dev team in our Slack"
          })

          {:error, result, container_output}

        json_result ->
          [last_message] = List.last(json_result)
          output_code = Regex.named_captures(~r/__code(?<code>.+)__/, last_message)["code"]
          case output_code do
            ^check_code -> {:ok, last_message, reset_statuses(json_result, container_output)}
            _           -> get_error_status(last_message, container_output, meta)
          end
      end
  end

  def get_compile_check_result(container_output, %{slug: "golang"}) do
    case Regex.run(~r/\.\/check\/solution\.go:.+/, container_output) do
        nil ->
          :ok
        result ->
          json_result = Jason.encode!(%{
            status: "error",
            result: List.first(result)
          })

          {:error, json_result, container_output}
      end
  end

  defp get_error_status(
    json_result,
    container_output,
    %{slug: slug}
  ) when slug in ["haskell", "perl"] do

    {:error, json_result, container_output}
  end
  defp get_error_status(json_result, container_output, _meta) do
    error_list = Regex.scan(~r/{"status":.*"error".+}/, container_output)
    case error_list do
      [] ->
        failure_list = Regex.scan(~r/{"status":.*"failure".+}/, container_output)
        success_list = Regex.scan(~r/{"status":.*"success".+}/, container_output)
        failure_count = length(failure_list)
        success_count = length(success_list)
        percent_of_success_tests = div(100 * success_count, (failure_count + success_count))

        [first_failure_json] = List.first(failure_list)
        asserts_list = failure_list ++ success_list
        new_container_output = reset_statuses(asserts_list, container_output)

        {
          :failure,
          first_failure_json,
          percent_of_success_tests,
          asserts_list,
          new_container_output
        }
      [_] ->

        {:error, json_result, container_output}
    end
  end

  defp reset_statuses(list, container_output) do
    Enum.reduce(list, container_output, fn [str], output -> String.replace(output, "#{str}\n", "", global: false) end)
  end
end
