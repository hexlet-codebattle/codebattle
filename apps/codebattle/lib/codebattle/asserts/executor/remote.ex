defmodule Codebattle.AssertsService.Executor.Remote do
  @moduledoc false

  alias Codebattle.AssertsService.Executor.Token
  alias Runner.AtomizedMap

  require Logger

  @spec call(Token.t()) :: Token.t()
  def call(token) do
    %{
      lang_slug: token.lang_meta.slug,
      solution_text: token.solution_text,
      arguments_generator_text: token.arguments_generator_text,
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

    case Req.post("#{runner_url()}/api/v1/generate",
           body: body,
           headers: headers,
           timeout: 30_000,
           recv_timeout: 30_000
         ) do
      {:ok, %Req.Response{status: 200, body: body}} ->
        AtomizedMap.load(body)

      {:ok, %Req.Response{body: body}} ->
        Logger.error("RemoteExecutor failure: #{inspect(body)}")
        {:error, %{base: "RemoteExecutor failure: #{inspect(body)}"}}

      {:error, reason} ->
        Logger.error("RemoteExecutor failure: #{inspect(reason)}")
        {:error, "RemoteExecutor failure: #{inspect(reason)}"}
    end
  end

  defp runner_url, do: Application.get_env(:runner, :runner_url)
  defp api_key, do: Application.get_env(:runner, :api_key)
end
