defmodule Codebattle.AssertsService.Executor.Local do
  @moduledoc false

  alias Codebattle.AssertsService.Executor.Token

  @spec call(Token.t()) :: Token.t()
  def call(token) do
    runner_task = Runner.Task.new!(token.task)

    %{container_output: container_output, exit_code: exit_code, seed: seed} =
      Runner.AssertsExecutor.call(
        runner_task,
        token.lang_meta,
        token.solution_text,
        token.arguments_generator_text
      )

    %{token | container_output: container_output, exit_code: exit_code, seed: seed}
  end
end
