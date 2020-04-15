defmodule Codebattle.CodeCheck.CheckResult do
  @moduledoc false

  # statuses: :initial, :ok, :failure, :error
  @derive {Poison.Encoder,
           only: [:status, :output, :result, :asserts, :asserts_count, :success_count]}

  defstruct success_count: 0,
            asserts_count: 0,
            status: :initial,
            result: "{}",
            asserts: [],
            output: ""

  def new, do: %__MODULE__{}
end
