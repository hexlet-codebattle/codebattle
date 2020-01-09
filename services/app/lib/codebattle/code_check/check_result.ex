defmodule Codebattle.CodeCheck.CheckResult do
  @moduledoc false

  @enforce_keys [:status, :result, :output]

  defstruct [:status, :result, :output, :failure_tests_count, :success_tests_count]
end
