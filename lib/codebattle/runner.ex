defmodule Codebattle.Runner do
  @moduledoc false

  alias Codebattle.Runner.LanguageMeta

  @type execution_result :: %{
          container_output: String.t(),
          container_stderr: String.t(),
          seed: String.t(),
          exit_code: non_neg_integer()
        }

  @spec execute_solution(Codebattle.Runner.Task.t(), LanguageMeta.t(), String.t(), String.t()) ::
          execution_result
  defdelegate execute_solution(task, lang_meta, solution_text, run_id),
    to: Codebattle.Runner.Executor,
    as: :call

  @spec generate_arguments(Codebattle.Runner.Task.t(), LanguageMeta.t(), String.t(), String.t()) ::
          execution_result
  defdelegate generate_arguments(task, lang_meta, solution_text, generator_text),
    to: Codebattle.Runner.AssertsExecutor,
    as: :call
end
