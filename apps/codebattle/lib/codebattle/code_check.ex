defmodule Codebattle.CodeCheck do
  @moduledoc false
  alias Codebattle.CodeCheck.Checker
  alias Codebattle.CodeCheck.Result
  alias Runner.LanguageMeta
  alias Runner.SolutionGenerator

  @type check_result :: Result.t() | Result.V2.t()
  @type executor :: Executor.Local | Executor.Fake | Executor.Remote
  @type check_meta :: %{
          optional(:user_id) => integer(),
          optional(:game_id) => integer(),
          optional(:tournament_id) => integer()
        }

  @spec check_solution(Codebattle.Task.t(), String.t(), String.t()) :: check_result
  def check_solution(task, solution_text, lang_slug) do
    Checker.call(task, solution_text, lang_slug, %{})
  end

  @spec check_solution(Codebattle.Task.t(), String.t(), String.t(), check_meta()) :: check_result
  def check_solution(task, solution_text, lang_slug, meta) do
    Checker.call(task, solution_text, lang_slug, meta)
  end

  @spec generate_solution_template(Codebattle.Task.t(), LanguageMeta.t()) :: String.t()
  def generate_solution_template(task, lang_meta) do
    runner_task = Runner.Task.new!(task)
    SolutionGenerator.call(runner_task, lang_meta)
  end
end
