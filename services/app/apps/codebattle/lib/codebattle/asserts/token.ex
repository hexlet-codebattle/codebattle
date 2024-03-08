defmodule Codebattle.AssertsService.Executor.Token do
  use TypedStruct

  alias Codebattle.AssertsService

  typedstruct enforce: true do
    field(:container_output, String.t())
    field(:container_stderr, String.t())
    field(:execution_error, String.t() | nil)
    field(:execution_time_msec, non_neg_integer() | nil)
    field(:executor, AssertsService.executor())
    field(:exit_code, non_neg_integer())
    field(:lang_meta, Runner.LanguageMeta.t())
    field(:result, AssertsService.Result.t() | nil)
    field(:seed, String.t())
    field(:solution_text, String.t())
    field(:arguments_generator_text, String.t())
    field(:task, Codebattle.Task.t())
  end
end
