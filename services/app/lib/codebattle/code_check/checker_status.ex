defmodule Codebattle.CodeCheck.CheckerStatus do
  def get_result(container_output, check_code, _meta) do
    json_result =
      case Regex.run(~r/{\"status\":.+}/, container_output) do
        nil ->
          Jason.encode!(%{
            status: "error",
            result: "Something went wrong! Please, write to dev team in our Slack"
          })

        arr ->
          List.first(arr)
      end

    output_code = Regex.named_captures(~r/__code(?<code>.+)__/, json_result)["code"]

    result =
      case output_code do
        ^check_code -> {:ok, json_result, container_output}
        _           -> {:error, json_result, container_output}
      end
  end
end
