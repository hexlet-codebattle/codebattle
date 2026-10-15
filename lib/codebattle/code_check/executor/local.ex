defmodule Codebattle.CodeCheck.Executor.Local do
  @moduledoc false

  alias Codebattle.CodeCheck.Checker.Token

  @spec call(Token.t()) :: Token.t()
  def call(token) do
    runner_task = Codebattle.Runner.Task.new!(token.task)

    %{
      container_output: container_output,
      container_stderr: container_stderr,
      exit_code: exit_code,
      seed: seed
    } =
      Codebattle.Runner.Executor.call(runner_task, token.lang_meta, token.solution_text, "")

    %{
      token
      | container_output: container_output,
        container_stderr: container_stderr,
        exit_code: exit_code,
        seed: seed
    }
  end
end
