defmodule Codebattle.CodeCheck.Result do
  @moduledoc false

  # statuses: "initial", "ok", "failure", "error"

  use TypedStruct
  @derive Jason.Encoder

  typedstruct do
    field(:success_count, integer, default: 0)
    field(:asserts_count, integer, default: 1)
    field(:status, String.t(), default: "initial")
    field(:output, String.t(), default: "")
    field(:result, String.t(), default: ~s({"status": "info"}))
    field(:asserts, [any()], default: [])
  end
end
