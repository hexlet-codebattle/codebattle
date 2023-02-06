defmodule Codebattle.CodeCheck.Executor.Remote do
  @moduledoc false

  require Logger

  @spec call(Token.t()) :: Token.t()
  def call(token) do
    %{
      lang_slug: token.lang_meta.slug,
      solution_text: token.solution_text,
      task: token.task
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
    case HTTPoison.post("#{executor_url()}/execute?key=#{api_key()}", Jason.encode!(params),
           timeout: 16_000,
           recv_timeout: 16_000
         ) do
      {:ok, %HTTPoison.Response{status_code: 200, body: body}} ->
        {:ok, AtomizedMap.load(body)}

      {:ok, %HTTPoison.Response{body: body}} ->
        Logger.error("RemoteExecutor failure: #{inspect(body)}")
        {:error, %{base: "RemoteExecutor failure: #{inspect(body)}"}}

      {:error, %HTTPoison.Error{reason: reason}} ->
        Logger.error("RemoteExecutor failure: #{inspect(reason)}")
        {:error, "RemoteExecutor failure: #{inspect(reason)}"}
    end
  end

  defp executor_url, do: Application.get_env(:codebattle, :executor)[:remote_url]
  defp api_key, do: Application.get_env(:codebattle, :executor)[:api_key]
end
