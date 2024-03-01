defmodule Codebattle.CodeCheck.Executor.RemoteRust do
  @moduledoc false

  require Logger

  alias Codebattle.CodeCheck.Checker.Token
  alias Runner.AtomizedMap
  alias Runner.Languages
  alias Runner.CheckerGenerator

  @spec call(Token.t()) :: Token.t()
  def call(token) do
    seed = get_seed()

    checker_text =
      if token.lang_meta.generate_checker? do
        CheckerGenerator.call(token.task, token.lang_meta, seed)
      else
        nil
      end

    asserts =
      token.task.asserts
      |> Enum.map(& &1.arguments)
      |> then(fn x -> %{arguments: x} end)
      |> Jason.encode!()

    %{
      checker_text: checker_text,
      lang_slug: token.lang_meta.slug,
      timeout: token.lang_meta.container_run_timeout,
      solution_text: token.solution_text,
      asserts: asserts
    }
    |> execute(token.lang_meta)
    |> case do
      {:ok, result} ->
        %{
          token
          | container_output: result.stdout,
            exit_code: result.exit_code,
            seed: seed,
            execution_error: nil
        }

      {:error, :timeout} ->
        %{token | execution_error: :timeout}

      {:error, reason} ->
        %{token | execution_error: reason}
    end
  end

  def execute(params, lang_meta) do
    headers = [
      {"content-type", "application/json"},
      {"content-encoding", "deflate"}
    ]

    body = params |> Jason.encode!() |> :zlib.compress()

    now = :os.system_time(:millisecond)

    :post
    |> Finch.build(runner_url(), headers, body)
    |> Finch.request(CodebattleHTTP, receive_timeout: Languages.get_timeout_ms(lang_meta))
    |> case do
      {:ok, %Finch.Response{status: 200, body: body}} ->
        Logger.error(
          "RemoteRustExecutor success lang: #{lang_meta.slug}, time_ms: #{:os.system_time(:millisecond) - now}}"
        )

        AtomizedMap.load(body)

      {:ok, %Finch.Response{status: status, body: body}} ->
        Logger.error(
          "RemoteRustExecutor failure status: #{status}, lang: #{lang_meta.slug},time_ms: #{:os.system_time(:millisecond) - now}, body: #{inspect(body)}"
        )

        {:error, "RemoteRustExecutor failure: #{inspect(body)}"}

      {:error, finch_exception} ->
        reason = Exception.format(:error, finch_exception, [])

        Logger.error(
          "RemoteRustExecutor error lang: #{lang_meta.slug}, time_ms: #{:os.system_time(:millisecond) - now}, error: #{inspect(reason)}"
        )

        {:error, :timeout}
    end
  end

  defp get_seed do
    to_string(:rand.uniform(10_000_000))
  end

  # defp runner_url, do: Application.get_env(:runner, :runner_rust_url)
  defp runner_url, do: "http://localhost:8000/run"
end
