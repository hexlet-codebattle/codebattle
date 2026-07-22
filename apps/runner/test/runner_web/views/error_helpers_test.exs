defmodule RunnerWeb.ErrorHelpersTest do
  use ExUnit.Case, async: true

  test "interpolates Ecto error options" do
    assert RunnerWeb.ErrorHelpers.translate_error({"must be at least %{count} characters", count: 3}) ==
             "must be at least 3 characters"
  end
end
