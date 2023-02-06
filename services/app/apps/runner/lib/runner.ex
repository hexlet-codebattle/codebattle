defmodule Runner do
  @moduledoc false
  Runner.Task

  @type execution_result :: %{
          container_output: String.t(),
          seed: String.t(),
          exit_code: non_neg_integer()
        }

  @spec execute_solution(Task.t(), Runner.LanguageMeta.t(), String.t()) :: execution_result
  def execute_solution(taks, lang_meta, solution_text) do
    %{
      container_output: "asdf",
      seed: "123",
      exit_code: 0
    }
  end
end
