defmodule Codebattle.CodeCheck.Checker do
  @moduledoc false
  alias Codebattle.CodeCheck
  alias Codebattle.CodeCheck.Checker.Token
  alias Codebattle.CodeCheck.OutputParser
  alias Runner.Languages

  require Logger

  @spec execute_check_synchronously(Codebattle.Task.t(), String.t(), String.t()) ::
          CodeCheck.check_result()
  def execute_check_synchronously(task, solution_text, lang_slug) do
    lang_meta = Languages.meta(lang_slug)

    token =
      Token
      |> struct(%{
        task: task,
        solution_text: solution_text,
        lang_meta: lang_meta,
        executor: get_executor()
      })
      |> do_execute_token()
      |> do_parse_output()

    token.result
  end

  def check_solution(
        caller_pid,
        task,
        solution_text,
        lang_slug,
        original_user_for_callback,
        original_editor_text_for_callback,
        original_editor_lang_for_callback
      ) do
    Task.Supervisor.async_nolink(Codebattle.CheckerTaskSupervisor, fn ->
      try
        lang_meta = Languages.meta(lang_slug)

        token_result =
          Token
          |> struct(%{
            task: task,
            solution_text: solution_text,
            lang_meta: lang_meta,
            executor: get_executor()
          })
          |> do_execute_token()
          |> do_parse_output()

        send(caller_pid, {:code_check_result, token_result.result, original_user_for_callback, original_editor_text_for_callback, original_editor_lang_for_callback})
      catch
        kind, reason ->
          stacktrace = __STACKTRACE__

          Logger.error(
            "Async check solution failed: #{kind} - #{inspect(reason)} - #{inspect(stacktrace)}"
          )

          send(caller_pid, {:code_check_error, {kind, reason, stacktrace}, original_user_for_callback, original_editor_text_for_callback, original_editor_lang_for_callback})
      end
    end)
  end

  defp do_execute_token(token) do
    {execution_time, new_token} = :timer.tc(fn -> token.executor.call(token) end)
    execution_time_msec = div(execution_time, 1_000)

    Logger.info(
      "Finished execution for lang: #{token.lang_meta.slug}, task: #{token.task.name}, time: #{execution_time_msec} msecs"
    )

    %{new_token | execution_time_msec: execution_time_msec}
  end

  defp do_parse_output(token) do
    %{token | result: OutputParser.call(token)}
  end

  defp get_executor, do: Application.fetch_env!(:codebattle, :checker_executor)
  # defp get_executor, do: Codebattle.CodeCheck.Executor.RemoteRust
end
