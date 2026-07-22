defmodule Runner.CheckerGeneratorTest do
  use Codebattle.DataCase, async: true

  alias Runner.CheckerGenerator
  alias Runner.CheckerGenerator.V2
  alias Runner.Languages

  test "work for all langs" do
    task = %Runner.Task{
      asserts: [
        %{
          arguments: [1, "a", 1.3, true, %{a: "b", c: "d"}, ["d", "e"], [["Jack", "Alice"]]],
          expected: ["asdf"]
        }
      ],
      input_signature: [
        %{
          argument_name: "a",
          type: %{name: "integer"}
        },
        %{
          argument_name: "text",
          type: %{name: "string"}
        },
        %{
          argument_name: "b",
          type: %{name: "float"}
        },
        %{
          argument_name: "c",
          type: %{name: "boolean"}
        },
        %{
          argument_name: "nested_hash_of_string",
          type: %{name: "hash", nested: %{name: "string"}}
        },
        %{
          argument_name: "nested_array_of_string",
          type: %{name: "array", nested: %{name: "string"}}
        },
        %{
          argument_name: "nested_array_of_array_of_strings",
          type: %{
            name: "array",
            nested: %{name: "array", nested: %{name: "string"}}
          }
        }
      ],
      output_signature: %{
        type: %{name: "array", nested: %{name: "string"}}
      }
    }

    Languages.meta()
    |> Map.values()
    |> Enum.filter(fn lang_meta -> lang_meta.generate_checker? end)
    |> Enum.each(fn lang_meta ->
      assert CheckerGenerator.call(task, lang_meta, "123")
    end)
  end

  test "renders empty hashes and false booleans" do
    task = %Runner.Task{
      asserts: [%{arguments: [%{}, false], expected: false}],
      input_signature: [
        %{argument_name: "values", type: %{name: "hash", nested: %{name: "integer"}}},
        %{argument_name: "enabled", type: %{name: "boolean"}}
      ],
      output_signature: %{type: %{name: "boolean"}}
    }

    lang_meta = Languages.meta("dart")
    checker = CheckerGenerator.call(task, lang_meta, "seed")

    assert checker =~ "{}"
    assert checker =~ "false"
  end

  test "version 2 languages use their image-provided runner" do
    task = %Runner.Task{asserts: [%{arguments: [1], expected: 2}]}
    meta = Languages.meta("ruby")

    assert V2.call(task, meta) == :runner
    assert CheckerGenerator.call(task, meta, "unused-seed") == :runner
  end
end
