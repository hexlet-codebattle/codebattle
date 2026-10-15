defmodule Codebattle.Runner.AssertsGeneratorTest do
  use Codebattle.DataCase, async: true

  alias Codebattle.Runner.AssertsGenerator
  alias Codebattle.Runner.Languages

  test "work for js lang" do
    task = %Codebattle.Runner.Task{
      asserts_examples: [
        %{
          arguments: [1, 2],
          expected: [3]
        }
      ],
      input_signature: [
        %{
          argument_name: "a",
          type: %{name: "integer"}
        },
        %{
          argument_name: "b",
          type: %{name: "integer"}
        }
      ],
      output_signature: %{
        type: %{name: "integer", nested: %{name: "string"}}
      }
    }

    lang_meta = Languages.meta()["js"]

    assert AssertsGenerator.call(task, lang_meta)

    # Languages.meta()
    # |> Map.values()
    # |> Enum.filter(fn lang_meta -> lang_meta.generate_checker? end)
    # |> Enum.each(fn lang_meta ->
    # end)
  end

  test "does not generate asserts for ruby" do
    assert AssertsGenerator.call(%Codebattle.Runner.Task{}, Languages.meta("ruby")) == :runner
  end
end
