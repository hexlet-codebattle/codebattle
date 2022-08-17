defmodule Codebattle.CodeCheck.CheckerGeneratorTest do
  use ExUnit.Case, async: true

  test "generates js" do
    assert Codebattle.CodeCheck.CheckerGenerator.inflect(
      %{
        asserts: [%{arguments: [1, 2], expected: [2, 1]}, %{arguments: [3, 5], expected: [5, 3]}],
        input_signature: [
          %{type: %{name: "integer"}},
          %{type: %{name: "integer"}}
        ],
        output_signature: %{type: %{name: "array", nested: %{name: "integer"}}}
      },
      Codebattle.Languages.meta("js")
    ) == [
      checks: [
        %{arguments: "1, 2", expected: "[2, 1]", index: 1},
        %{arguments: "3, 5", expected: "[5, 3]", index: 2}
      ]
    ]
  end

  Codebattle.CodeCheck.CheckerGenerator.inflect(
    %{
      asserts: [%{arguments: ["str1", "str2"], expected: %{str1: 3, str2: 3}}],
      input_signature: [
        %{type: %{name: "string"}},
        %{type: %{name: "string"}}
      ],
      output_signature: %{type: %{name: "hash", nested: %{name: "integer"}}}
    },
    Codebattle.Languages.meta("js")
  )

  [
    checks: [
      %{
        arguments: "\"str1\", \"str2\"",
        expected: "{\"str1\": 3, \"str2\": 3}",
        index: 1
      }
    ]
  ]

  Codebattle.CodeCheck.CheckerGenerator.inflect(
    %{
      asserts: [%{arguments: [["str1", "str2"]], expected: %{str1: 1, str2: 1}}],
      input_signature: [
        %{argument_name: "arr", type: %{name: "array", nested: %{name: "string"}}}
      ],
      output_signature: %{type: %{name: "hash", nested: %{name: "integer"}}}
    },
    Codebattle.Languages.meta("js")
  )

  [
    checks: [
      %{
        arguments: %{
          info: [%{name: "arr1", defining: "arr1: Array<string>", value: "[\"str1\", \"str2\"]"}],
          expression: "arr1"
        },
        expected: %{defining: "expected1: IHash", value: "{\"str1\": 1, \"str2\": 1}"},
        index: 1
      }
    ]
  ]

  Codebattle.CodeCheck.CheckerGenerator.inflect(
    %{
      asserts: [%{arguments: [["str1", "str2"]], expected: %{str1: 1, str2: 1}}],
      input_signature: [
        %{argument_name: "arr", type: %{name: "array", nested: %{name: "string"}}}
      ],
      output_signature: %{type: %{name: "hash", nested: %{name: "integer"}}}
    },
    Codebattle.Languages.meta("golang")
  )

  [
    checks: [
      %{
        arguments: %{
          info: [
            %{name: "arr1", defining: "arr1 []string", value: "[]string{\"str1\", \"str2\"}"}
          ],
          expression: "arr1"
        },
        expected: %{
          defining: "expected1 map[string]int64",
          value: "map[string]int64{\"str1\": 1, \"str2\": 1}"
        },
        index: 1
      }
    ]
  ]
end
