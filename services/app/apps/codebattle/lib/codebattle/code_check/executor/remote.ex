defmodule Codebattle.CodeCheck.Executor.Remote do
  @moduledoc false

  require Logger

  alias Codebattle.AtomizedMap
  alias Codebattle.CodeCheck.Checker.Token

  @spec call(Token.t()) :: Token.t()
  def call(token) do
    %{
      lang_slug: token.lang_meta.slug,
      solution_text: token.solution_text,
      task: Runner.Task.new!(token.task)
    }
    |> execute()
    |> case do
      {:ok, result} ->
        %{
          token
          | container_output: result.container_output,
            exit_code: result.exit_code,
            seed: result.seed
        }

      {:error, reason} ->
        %{token | execution_error: reason}
    end
  end

  defp execute(params) do
    headers = [{"content-type", "application/json"}, {"x-auth-key", api_key()}]
    body = Jason.encode!(params)
    now = :os.system_time(:millisecond)

    case HTTPoison.post("#{executor_url()}/api/v1/execute", body, headers,
           timeout: 30_000,
           recv_timeout: 30_000
         ) do
      {:ok, %HTTPoison.Response{status_code: 200, body: body}} ->
        Logger.error(
          "RemoteExecutor success lang: #{params.lang_slug}, time_ms: #{:os.system_time(:millisecond) - now}}"
        )

        AtomizedMap.load(body)

      {:ok, %HTTPoison.Response{body: body}} ->
        Logger.error(
          "RemoteExecutor failure lang: #{params.lang_slug},time_ms: #{:os.system_time(:millisecond) - now}, body: #{inspect(body)}"
        )

        {:error, %{base: "RemoteExecutor failure: #{inspect(body)}"}}

      {:error, %HTTPoison.Error{reason: reason}} ->
        Logger.error(
          "RemoteExecutor error lang: #{params.lang_slug}, time_ms: #{:os.system_time(:millisecond) - now}, body: #{inspect(body)}"
        )

        {:error, "RemoteExecutor failure: #{inspect(reason)}"}
    end
  end

  defp executor_url, do: Application.get_env(:codebattle, :executor)[:runner_url]
  defp api_key, do: Application.get_env(:codebattle, :executor)[:api_key]
end
