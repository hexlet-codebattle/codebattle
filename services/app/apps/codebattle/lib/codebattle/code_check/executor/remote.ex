defmodule Codebattle.CodeCheck.Executor.Remote do
  @moduledoc false

  require Logger

  alias Codebattle.CodeCheck.Checker.Token
  alias Runner.AtomizedMap
  alias Runner.Languages

  @spec call(Token.t()) :: Token.t()
  def call(token) do
    %{
      lang_slug: token.lang_meta.slug,
      solution_text: token.solution_text,
      task: Runner.Task.new!(token.task)
    }
    |> execute(token.lang_meta)
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

  def execute(params, lang_meta) do
    headers = [{"content-type", "application/json"}, {"x-auth-key", api_key()}]
    body = Jason.encode!(params)
    now = :os.system_time(:millisecond)

    :post
    |> Finch.build("#{executor_url()}/api/v1/execute", headers, body)
    |> Finch.request(CodebattleHTTP, receive_timeout: Languages.get_timeout_ms(lang_meta))
    |> case do
      # case HTTPoison.post("#{executor_url()}/api/v1/execute", body, headers,
      #        timeout: 30_000,
      #        recv_timeout: 30_000
      #      ) do
      {:ok, %Finch.Response{status: 200, body: body}} ->
        Logger.error(
          "RemoteExecutor success lang: #{lang_meta.slug}, time_ms: #{:os.system_time(:millisecond) - now}}"
        )

        AtomizedMap.load(body)

      {:ok, %Finch.Response{status: status, body: body}} ->
        Logger.error(
          "RemoteExecutor failure status: #{status}, lang: #{lang_meta.slug},time_ms: #{:os.system_time(:millisecond) - now}, body: #{inspect(body)}"
        )

        {:error, %{base: "RemoteExecutor failure: #{inspect(body)}"}}

      {:error, finch_exception} ->
        reason = Exception.format(:error, finch_exception, [])

        Logger.error(
          "RemoteExecutor error lang: #{lang_meta.slug}, time_ms: #{:os.system_time(:millisecond) - now}, error: #{inspect(reason)}"
        )

        {:error, "RemoteExecutor failure: #{inspect(reason)}"}
    end
  end

  defp executor_url, do: Application.get_env(:runner, :executor)[:runner_url]
  defp api_key, do: Application.get_env(:runner, :executor)[:api_key]
end
