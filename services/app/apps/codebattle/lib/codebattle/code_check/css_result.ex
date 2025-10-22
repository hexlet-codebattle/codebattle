defmodule Codebattle.CodeCheck.CssResult do
  use TypedStruct

  @moduledoc """
  statuses:
  initial ->  no check runs
  started -> docker execution
  ok -> all tests were successful
  failure -> final snapshots doesn't matches
  error -> compile error, or out of memory
  service_timeout -> remote execution timeout
  service_failure ->  remote execution failure
  """

  @derive Jason.Encoder

  typedstruct do
    field(:exit_code, integer, default: 0)
    field(:status, String.t(), default: "initial")
    field(:solution_html, String.t(), default: "")
    field(:solution_style, String.t(), default: "")
    field(:solution_data_url, String.t(), default: "")
    field(:diff_data_url, String.t(), default: "")
    field(:solution_percentage, integer, default: 0)
    field(:output_error, String.t(), default: "")
    field(:version, integer, default: 1)
  end

  def new, do: %__MODULE__{}
end
