defmodule Runner.SolutionGeneratorTypeTests.AllLanguagesTypeTest do
  use ExUnit.Case, async: true

  alias Runner.Languages
  alias Runner.SolutionGenerator
  alias Runner.Task

  @type_cases [
    %{
      name: "string",
      input_signature: [%{argument_name: "inputString", type: %{name: "string"}}],
      output_signature: %{type: %{name: "string"}}
    },
    %{
      name: "integer",
      input_signature: [%{argument_name: "inputInteger", type: %{name: "integer"}}],
      output_signature: %{type: %{name: "integer"}}
    },
    %{
      name: "array of string",
      input_signature: [%{argument_name: "inputArray", type: %{name: "array", nested: %{name: "string"}}}],
      output_signature: %{type: %{name: "array", nested: %{name: "string"}}}
    },
    %{
      name: "hash of string",
      input_signature: [%{argument_name: "inputHash", type: %{name: "hash", nested: %{name: "string"}}}],
      output_signature: %{type: %{name: "hash", nested: %{name: "string"}}}
    },
    %{
      name: "nested array",
      input_signature: [
        %{argument_name: "inputNestedArray", type: %{name: "array", nested: %{name: "array", nested: %{name: "string"}}}}
      ],
      output_signature: %{type: %{name: "array", nested: %{name: "array", nested: %{name: "string"}}}}
    },
    %{
      name: "complex nested",
      input_signature: [
        %{
          argument_name: "inputComplex",
          type: %{
            name: "array",
            nested: %{
              name: "hash",
              nested: %{name: "hash", nested: %{name: "array", nested: %{name: "string"}}}
            }
          }
        }
      ],
      output_signature: %{
        type: %{
          name: "array",
          nested: %{
            name: "hash",
            nested: %{name: "hash", nested: %{name: "array", nested: %{name: "string"}}}
          }
        }
      }
    }
  ]

  for lang_slug <- Languages.get_lang_slugs(),
      type_case <- @type_cases do
    @lang_slug lang_slug
    @type_case type_case

    test "#{@lang_slug} generates a solution template for #{@type_case.name}" do
      task =
        Task.new!(%{
          input_signature: @type_case.input_signature,
          output_signature: @type_case.output_signature,
          asserts: [],
          asserts_examples: []
        })

      template = SolutionGenerator.call(task, Languages.meta(@lang_slug))

      assert is_binary(template)
      assert template != ""
      assert String.contains?(template, "solution")
    end
  end

  test "zig generates a solution template for hash outputs" do
    task =
      Task.new!(%{
        input_signature: [%{argument_name: "arr", type: %{name: "array", nested: %{name: "string"}}}],
        output_signature: %{type: %{name: "hash", nested: %{name: "integer"}}},
        asserts: [],
        asserts_examples: []
      })

    template = SolutionGenerator.call(task, Languages.meta("zig"))

    assert template =~ "std.StringHashMap(i64)"
    assert template =~ "m.put(\"key\", 0)"
  end

  test "dlang generates a solution template and a checker for nested types" do
    task =
      Task.new!(%{
        input_signature: [%{argument_name: "arr", type: %{name: "array", nested: %{name: "string"}}}],
        output_signature: %{type: %{name: "hash", nested: %{name: "integer"}}},
        asserts: [%{arguments: [["a", "b"]], expected: %{"a" => 1}}, %{arguments: [[]], expected: %{}}],
        asserts_examples: []
      })

    meta = Languages.meta("dlang")
    template = SolutionGenerator.call(task, meta)

    assert template =~ "long[string] solution(string[] arr)"
    assert template =~ ~s(["key": 0])

    checker = Runner.CheckerGenerator.call(task, meta, "seed")

    assert checker =~ ~s(string[] arr1 = ["a", "b"];)
    assert checker =~ "solution.solution(arr1)"
    assert checker =~ "string[] arr2 = [];"
  end
end
