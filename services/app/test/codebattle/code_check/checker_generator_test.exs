defmodule Codebattle.CodeCheck.CheckerGeneratorTest do
  use Codebattle.DataCase, async: true

  alias Codebattle.CodeCheck.CheckerGenerator
  alias Codebattle.Languages

  setup do
    {:ok, %{seed: "123", task: build(:task_with_all_data_types)}}
  end

  test "work for all langs", context do
    Languages.meta()
    |> Map.values()
    |> Enum.each(fn meta ->
      assert CheckerGenerator.call(Map.put(context, :lang_meta, meta))
    end)
  end
end
