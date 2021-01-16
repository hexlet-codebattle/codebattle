defmodule Codebattle.CodeCheck.CheckResultV2 do
  @moduledoc
  """
  statuses:
  :initial ->  no check runs
  :ok -> successfully all tests
  :failure -> some tests fails
  :error -> compile error, or out of memory
  """

  @derive Jason.Encoder

  defstruct success_count: 0,
            asserts_count: 0,
            status: :initial,
            output: "",
            asserts: []

  def new, do: %__MODULE__{}

  defmodule AssertResult do
    @moduledoc
    """
    statuses:
    :result -> value from solution()
    :error -> catched error from solution()
    """

    @derive Jason.Encoder

    defstruct type: "result",
              time: 0.0,
              value: nil,
              expected: nil,
              arguments: nil,
              output: ""
  end
end
