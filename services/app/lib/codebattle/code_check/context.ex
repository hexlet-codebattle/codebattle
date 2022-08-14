defmodule Codebattle.CodeCheck.Context do
  alias Codebattle.Languages
  alias Codebattle.CodeCheck
  alias Codebattle.Task

  @spec run_check(Task.t(), String.t(), String.t()) ::
          CodeCheck.CheckResult.t() | CodeCheck.CheckResultV2.t()
  def run_check(task, solution, lang) do
    case Languages.meta() |> Map.get(lang) do
      nil -> %CodeCheck.CheckResult{status: "error", result: "#{lang} is undefined", output: ""}
      %{checker_version: 2} = meta -> CodeCheck.CheckerV2.call(task, solution, meta)
      meta -> CodeCheck.Checker.call(task, solution, meta)
    end
  end
end
