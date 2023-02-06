defmodule Codebattle.CodeCheck do
  alias Codebattle.CodeCheck.Checker
  alias Codebattle.CodeCheck.Result
  alias Runner.LanguageMeta
  alias Runner.SolutionGenerator

  @type check_result :: Result.t() | Result.V2.t()
  @type executor :: Executor.Local | Executor.Fake | Executor.Remote

  @spec check_solution(Codebattle.Task.t(), String.t(), String.t()) :: check_result
  defdelegate check_solution(task, solution_text, lang_slug), to: Checker, as: :call

  @spec generate_solution_template(LanguageMeta.t(), Task.t()) :: String.t()
  defdelegate generate_solution_template(lang_meta, task), to: SolutionGenerator, as: :call
end
