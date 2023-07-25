defmodule Runner do
  @moduledoc false
  Runner.Task

  @type execution_result :: %{
          container_output: String.t(),
          seed: String.t(),
          exit_code: non_neg_integer()
        }

  @spec execute_solution(Runner.Task.t(), Runner.LanguageMeta.t(), String.t()) :: execution_result
  defdelegate execute_solution(task, lang_meta, solution_text), to: Runner.Executor, as: :call

  @spec generate_arguments(Runner.Task.t(), Runner.LanguageMeta.t(), String.t(), String.t()) ::
          execution_result
  defdelegate generate_arguments(task, lang_meta, solution_text, generator_text),
    to: Runner.AssertsExecutor,
    as: :call
end
