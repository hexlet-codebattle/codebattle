defmodule Codebattle.CodeCheck.CheckResultV2 do
  use TypedStruct

  @moduledoc """
  statuses:
  initial ->  no check runs
  ok -> successfully all tests
  failure -> some tests fails
  error -> compile error, or out of memory
  """

  @derive Jason.Encoder

  typedstruct do
    field(:success_count, integer, default: 0)
    field(:asserts_count, integer, default: 0)
    field(:status, String.t(), default: "initial")
    field(:output_error, String.t(), default: "")
    field(:version, integer, default: 2)
    field(:asserts, [Codebattle.CodeCheck.CheckResultV2.AssertResult.t()], default: [])
  end

  def new, do: %__MODULE__{}

  defmodule AssertResult do
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
end
