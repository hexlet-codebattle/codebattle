defmodule Codebattle.CodeCheck.OutputParser do
  @moduledoc "Parse container output for representing check status of solution"

  alias Codebattle.CodeCheck.Result

  require Logger

  def call(%{lang_meta: %{output_version: 2}} = token) do
    Codebattle.CodeCheck.OutputParser.V2.call(token)
  end

  def call(%{execution_error: :timeout}) do
    %Result{status: "service_timeout"}
  end

  def call(%{execution_error: error}) when not is_nil(error) do
    %Result{
      status: "service_failure",
      output: inspect(error)
    }
  end

  def call(token) do
    %{container_output: container_output, container_stderr: container_stderr, seed: seed} = token

    case Regex.scan(~r/{\"status\":.+}|{\"arguments\":.+}|{\"result\":.+}/, container_output) do
      [] ->
        handle_output_without_status(token, container_output, container_stderr)

      json_result ->
        [last_message] = List.last(json_result)
        checker_code = Regex.named_captures(~r/__seed:(?<seed>.+)__/, last_message)["seed"]

        if checker_code == seed do
          %Result{
            status: "ok",
            result: last_message,
            output: reset_statuses(container_output, List.flatten(json_result))
          }
        else
          get_error_status(last_message, container_output, container_stderr)
        end
    end
  end

  defp handle_output_without_status(token, container_output, container_stderr) do
    error_msg =
      cond do
        token.exit_code == 2 and String.contains?(container_output, "Killed") ->
          "Your solution ran out of memory, please, rewrite it"

        token.exit_code == 143 and String.contains?(container_output, "SIGTERM") ->
          "Your solution was executed for longer than 15 seconds, try to write more optimally"

        token.exit_code == 2 ->
          """
          STDERR:\n#{container_stderr}\n
          STDOUT:#{container_output}
          """

        true ->
          "Something went wrong! Please, write to dev team in our Telegram \n UNKNOWN_ERROR: #{container_output}}"
      end

    result = Jason.encode!(%{status: "error", result: error_msg})

    %Result{status: "error", result: result, output: error_msg}
  end

  defp get_error_status(_error_message, container_output, container_stderr) do
    case Regex.scan(~r/{"status":.{0,3}"error".+}/, container_output) do
      [] ->
        failure_list = Regex.scan(~r/{"status":.{0,3}"failure".+}/, container_output)
        success_list = Regex.scan(~r/{"status":.{0,3}"success".+}/, container_output)
        failure_count = length(failure_list)
        success_count = length(success_list)

        [first_failure_json] = List.first(failure_list)
        asserts = extract_jsons(failure_list) ++ extract_jsons(success_list)

        new_container_output =
          container_output
          |> cut_output_by_delimiter(first_failure_json)
          |> reset_statuses(success_list)

        %Result{
          status: "failure",
          result: first_failure_json,
          output: new_container_output,
          asserts: asserts,
          success_count: success_count,
          asserts_count: failure_count + success_count
        }

      [_] ->
        %Result{status: "error", result: container_stderr, output: container_stderr}
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
