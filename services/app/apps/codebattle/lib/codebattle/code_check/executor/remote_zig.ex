defmodule Codebattle.CodeCheck.Executor.RemoteZig do
  @moduledoc false

  alias Codebattle.CodeCheck.Checker.Token
  alias Runner.AtomizedMap
  alias Runner.CheckerGenerator
  alias Runner.Languages

  require Logger

  @spec call(Token.t()) :: Token.t()
  def call(token) do
    seed = get_seed()

    checker_text =
      if token.lang_meta.generate_checker? do
        CheckerGenerator.call(token.task, token.lang_meta, seed)
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
            container_stderr: result.stderr,
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
      {"content-type", "application/json"}
    ]

    Logger.debug("RemoteZigExecutor request params: #{Jason.encode!(params)}")

    body = Jason.encode!(params)

    now = :os.system_time(:millisecond)

    :post
    |> Finch.build(runner_url(lang_meta.slug), headers, body)
    |> Finch.request(CodebattleHTTP, receive_timeout: Languages.get_timeout_ms(lang_meta))
    |> case do
      {:ok, %Finch.Response{status: 200, body: body}} ->
        Logger.debug("RemoteZigExecutor Response #{inspect(body)}")

        Logger.error(
          "RemoteZigExecutor success lang: #{lang_meta.slug}, time_ms: #{:os.system_time(:millisecond) - now}}"
        )

        AtomizedMap.load(body)

      {:ok, %Finch.Response{status: status, body: body}} ->
        Logger.error(
          "RemoteZigExecutor failure status: #{status}, lang: #{lang_meta.slug},time_ms: #{:os.system_time(:millisecond) - now}, body: #{inspect(body)}"
        )

        {:error, "RemoteZigExecutor failure: #{inspect(body)}"}

      {:error, finch_exception} ->
        reason = Exception.format(:error, finch_exception, [])

        Logger.error(
          "RemoteZigExecutor error lang: #{lang_meta.slug}, time_ms: #{:os.system_time(:millisecond) - now}, error: #{inspect(reason)}"
        )

        {:error, :timeout}
    end
  end

  defp get_seed do
    to_string(:rand.uniform(10_000_000))
  end

  defp runner_url(lang) do
    namespace = Application.get_env(:codebattle, :k8s_namespace, "default")
    "http://runner-#{lang}.#{namespace}.svc/run"
    # "http://localhost:4040/run"
  end
end
