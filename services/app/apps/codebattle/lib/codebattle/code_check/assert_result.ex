defmodule Codebattle.CodeCheck.Result.V2.AssertResult do
  use TypedStruct

  @moduledoc """
  statuses:
  failure -> wrong assert check
  success -> success assert check
  error   -> caught error from solution()
  """

  @derive Jason.Encoder

  typedstruct do
    field(:status, String.t(), enforce: true)
    field(:execution_time, float, default: 0.0)
    field(:output, String.t(), default: "")
    field(:result, any())
    field(:expected, [any()], default: [])
    field(:arguments, [any()], default: [])
  end
end
