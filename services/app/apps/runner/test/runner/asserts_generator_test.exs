defmodule Runner.AssertsGeneratorTest do
  use Codebattle.DataCase, async: true

  alias Runner.AssertsGenerator
  alias Runner.Languages

  test "work for js lang" do
    task = %Runner.Task{
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
end
