defmodule Codebattle.CodeCheck.OutputParser do
  @moduledoc "Parse container output for representing check status of solution"

  require Logger
  alias Codebattle.CodeCheck.Result

  def call(%{lang_meta: %{checker_version: 2}} = token) do
    Codebattle.CodeCheck.OutputParser.V2.call(token)
  end

  def call(token) do
    %{raw_docker_output: raw_docker_output, seed: seed} = token

    case Regex.scan(~r/{\"status\":.+}/, raw_docker_output) do
      [] ->
        error_msg =
          cond do
            token.exit_code == 2 and String.contains?(raw_docker_output, "Killed") ->
              "Your solution ran out of memory, please, rewrite it"

            token.exit_code == 143 and String.contains?(raw_docker_output, "SIGTERM") ->
              "Your solution was executed for longer than 10 seconds, try to write more optimally"

            token.exit_code == 2 ->
              raw_docker_output

            true ->
              "Something went wrong! Please, write to dev team in our Slack \n UNKNOWN_ERROR: #{raw_docker_output}}"
          end

        result = Jason.encode!(%{status: "error", result: error_msg})

        %Result{status: "error", result: result, output: error_msg}

      json_result ->
        [last_message] = List.last(json_result)
        checker_code = Regex.named_captures(~r/__seed:(?<seed>.+)__/, last_message)["seed"]

        if checker_code == seed do
          %Result{
            status: "ok",
            result: last_message,
            output: reset_statuses(raw_docker_output, List.flatten(json_result))
          }
        else
          get_error_status(last_message, raw_docker_output)
        end
    end
  end

  defp get_error_status(error_message, raw_docker_output) do
    case Regex.scan(~r/{"status":.{0,3}"error".+}/, raw_docker_output) do
      [] ->
        failure_list = Regex.scan(~r/{"status":.{0,3}"failure".+}/, raw_docker_output)
        success_list = Regex.scan(~r/{"status":.{0,3}"success".+}/, raw_docker_output)
        failure_count = length(failure_list)
        success_count = length(success_list)

        [first_failure_json] = List.first(failure_list)
        asserts = extract_jsons(failure_list) ++ extract_jsons(success_list)

        new_container_output =
          raw_docker_output
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
        %Result{status: "error", result: error_message, output: raw_docker_output}
    end
  end

  defp cut_output_by_delimiter(raw_docker_output, delimiter) do
    result =
      raw_docker_output
      |> String.split(delimiter)
      |> List.first()

    result <> delimiter
  end

  defp reset_statuses(raw_docker_output, list) do
    Enum.reduce(list, raw_docker_output, fn str, output ->
      String.replace(output, "#{str}\n", "", global: false)
    end)
  end

  defp extract_jsons(list), do: Enum.map(list, &List.first/1)
end
