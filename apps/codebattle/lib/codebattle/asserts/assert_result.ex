defmodule Codebattle.AssertsService.AssertResult do
  @moduledoc """
  statuses:
  failure -> wrong assert check/generate
  success -> success assert check/generate
  error   -> caught error from solution/arguments generator
  """
  use TypedStruct

  @derive Jason.Encoder

  typedstruct do
    field(:status, String.t(), enforce: true)
    field(:execution_time, float, default: 0.0)
    field(:output, String.t(), default: "")
    field(:arguments, [any()], default: [])
    field(:expected, any())
    field(:actual, any())
    field(:message, String.t(), default: "")
  end
end
