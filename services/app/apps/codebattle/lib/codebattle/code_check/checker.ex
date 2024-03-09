defmodule Codebattle.CodeCheck.Checker do
  alias Codebattle.CodeCheck
  alias Codebattle.CodeCheck.Checker.Token
  alias Codebattle.CodeCheck.OutputParser
  alias Runner.Languages

  require Logger

  @spec call(Codebattle.Task.t(), String.t(), String.t()) :: CodeCheck.check_result()
  def call(task, solution_text, lang_slug) do
    lang_meta = Languages.meta(lang_slug)

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

  defp get_executor, do: Application.fetch_env!(:codebattle, :checker_executor)
  # defp get_executor, do: Codebattle.CodeCheck.Executor.RemoteRust
end
