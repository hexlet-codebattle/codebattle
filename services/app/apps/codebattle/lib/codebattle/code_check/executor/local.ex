defmodule Codebattle.CodeCheck.Executor.Local do
  @moduledoc false

  alias Codebattle.CodeCheck.Checker.Token

  @spec call(Token.t()) :: Token.t()
  def call(token) do
    runner_taks = Runner.Task.new!(token.task)

    %{container_output: container_output, exit_code: exit_code, seed: seed} =
      Runner.Executor.call(runner_taks, token.lang_meta, token.solution_text)

    %{token | container_output: container_output, exit_code: exit_code, seed: seed}
  end
end
