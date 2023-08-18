defmodule Codebattle.CodeCheck.Result.V2 do
  use TypedStruct

  alias Codebattle.CodeCheck.Result

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
    field(:asserts, [Result.V2.AssertResult.t()], default: [])
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
