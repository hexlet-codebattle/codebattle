defmodule Runner do
  @moduledoc false
  Runner.Task

  @type execution_result :: %{
          container_output: String.t(),
          seed: String.t(),
          exit_code: non_neg_integer()
        }

  @spec execute_solution(Runner.Task.t(), Runner.LanguageMeta.t(), String.t()) :: execution_result
  defdelegate execute_solution(taks, lang_meta, solution_text), to: Runner.Executor, as: :call
end
