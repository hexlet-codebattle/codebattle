defmodule Codebattle.CodeCheck.CheckResult do
  @moduledoc false

  # statuses: :initial, :ok, :failure, :error
  @derive Jason.Encoder

  defstruct success_count: 0,
            asserts_count: 0,
            status: :initial,
            result: "{}",
            asserts: [],
            output: ""

  def new, do: %__MODULE__{}
end
