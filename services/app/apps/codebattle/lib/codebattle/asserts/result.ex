defmodule Codebattle.AssertsService.Result do
  use TypedStruct

  alias Codebattle.AssertsService.AssertResult

  @moduledoc """
  statuses:
  initial ->  no generation runs
  started -> docker execution
  ok -> all asserts were successful checked/generated
  failure -> some asserts checks/generate fails
  error -> compile error, or out of memory
  """

  @derive Jason.Encoder

  typedstruct do
    field(:exit_code, integer, default: 0)
    field(:status, String.t(), default: "initial")
    field(:output_error, String.t(), default: "")
    field(:asserts, [AssertResult.t()], default: [])
  end

  def new, do: %__MODULE__{}
end
