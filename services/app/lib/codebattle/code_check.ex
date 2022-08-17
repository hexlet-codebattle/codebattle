defmodule Codebattle.CodeCheck do
  alias Codebattle.CodeCheck.Checker
  alias Codebattle.CodeCheck.Result
  alias Codebattle.CodeCheck.SolutionTemplateGenerator
  alias Codebattle.LanguageMeta
  alias Codebattle.Task

  @spec run_checker(Task.t(), String.t(), String.t()) :: Result.t() | Result.V2.t()
  defdelegate run_checker(task, solution_text, lang_slug),
    to: Checker,
    as: :call

  @spec generate_solution_template(LanguageMeta.t(), Task.t()) :: String.t()
  defdelegate generate_solution_template(lang_meta, task),
    to: SolutionTemplateGenerator,
    as: :call
end
