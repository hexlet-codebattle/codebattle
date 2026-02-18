defmodule Codebattle.CodeCheck.Checker do
  @moduledoc false
  alias Codebattle.CodeCheck
  alias Codebattle.CodeCheck.Checker.Token
  alias Codebattle.CodeCheck.OutputParser
  alias Codebattle.CodeCheck.RunLogger
  alias Runner.Languages

  require Logger

  @spec call(Codebattle.Task.t(), String.t(), String.t(), CodeCheck.check_meta()) :: CodeCheck.check_result()
  def call(task, solution_text, lang_slug, meta \\ %{}) do
    lang_meta = Languages.meta(lang_slug)
    started_at = DateTime.utc_now()

    token =
      Token
      |> struct(%{
        task: task,
        solution_text: solution_text,
        lang_meta: lang_meta,
        executor: get_executor()
      })
      |> execute()
      |> parse_output()

    maybe_log_run_async(token, meta, started_at)
    maybe_emit_telemetry(token, meta)

    token.result
  end

  defp execute(token) do
    {execution_time, new_token} = :timer.tc(fn -> token.executor.call(token) end)
    execution_time_msec = div(execution_time, 1_000)

    Logger.info(
      "Finished execution for lang: #{token.lang_meta.slug}, task: #{token.task.name}, time: #{execution_time_msec} msecs"
    )

    %{new_token | execution_time_msec: execution_time_msec}
  end

  defp parse_output(token) do
    %{token | result: OutputParser.call(token)}
  end

  defp maybe_log_run_async(token, %{game_id: game_id} = meta, started_at) when is_integer(game_id) do
    RunLogger.log_async(%{
      user_id: meta[:user_id],
      game_id: game_id,
      tournament_id: meta[:tournament_id],
      lang: token.lang_meta.slug,
      started_at: started_at,
      duration_ms: token.execution_time_msec,
      result: token.result.status
    })
  end

  defp maybe_log_run_async(_token, _meta, _started_at), do: :ok

  defp maybe_emit_telemetry(token, %{game_id: game_id}) when is_integer(game_id) do
    :telemetry.execute(
      [:codebattle, :code_check, :run],
      %{count: 1, duration_ms: token.execution_time_msec},
      %{lang: token.lang_meta.slug, result: token.result.status}
    )
  rescue
    _ -> :ok
  end

  defp maybe_emit_telemetry(_token, _meta), do: :ok

  defp get_executor do
    if FunWithFlags.enabled?(:use_remote_zig_executor) do
      Codebattle.CodeCheck.Executor.RemoteZig
    else
      Application.fetch_env!(:codebattle, :checker_executor)
    end
  end
end
