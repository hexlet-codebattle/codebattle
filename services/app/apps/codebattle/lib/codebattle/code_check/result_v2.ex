defmodule Codebattle.CodeCheck.Result.V2 do
  use TypedStruct

  alias Codebattle.CodeCheck.Result.V2.AssertResult

  @moduledoc """
  statuses:
  initial ->  no check runs
  started -> docker execution
  ok -> all tests were successful
  failure -> some tests fails
  error -> compile error, or out of memory
  """

  @derive Jason.Encoder

  typedstruct do
    field(:exit_code, integer, default: 0)
    field(:success_count, integer, default: 0)
    field(:asserts_count, integer, default: 1)
    field(:status, String.t(), default: "initial")
    field(:output_error, String.t(), default: "")
    field(:version, integer, default: 2)
    field(:asserts, [AssertResult.t()], default: [])
  end

  def new, do: %__MODULE__{}
end
