defmodule Codebattle.AssertsService.Result do
  use TypedStruct

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

  defmodule AssertResult do
    use TypedStruct

    @moduledoc """
    statuses:
    failure -> wrong assert check/generate
    success -> success assert check/generate
    error   -> caught error from solution/arguments generator
    """

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
end
