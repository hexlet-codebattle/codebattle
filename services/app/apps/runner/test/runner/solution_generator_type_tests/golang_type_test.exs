defmodule Runner.SolutionGeneratorTypeTests.GolangTypeTest do
  use ExUnit.Case, async: true

  alias Runner.Languages
  alias Runner.SolutionGenerator

  # Test for string input and output
  test "golang with string input and output" do
    task = %Runner.Task{
      asserts: [
        %{
          arguments: ["hello"],
          expected: "world"
        }
      ],
      input_signature: [
        %{
          argument_name: "inputString",
          type: %{name: "string"}
        }
      ],
      output_signature: %{
        type: %{name: "string"}
      }
    }

    expected = """
    package main
    // import "fmt"

    func solution(inputString string) string {
      var ans  string
      return ans
    }
    // use stdout to debug
    """

    assert String.trim_trailing(expected, "\n") ==
             SolutionGenerator.call(task, Languages.meta("golang"))
  end

  # Test for integer input and output
  test "golang with integer input and output" do
    task = %Runner.Task{
      asserts: [
        %{
          arguments: [42],
          expected: 84
        }
      ],
      input_signature: [
        %{
          argument_name: "inputInteger",
          type: %{name: "integer"}
        }
      ],
      output_signature: %{
        type: %{name: "integer"}
      }
    }

    expected = """
    package main
    // import "fmt"

    func solution(inputInteger int) int {
      var ans  int
      return ans
    }
    // use stdout to debug
    """

    assert String.trim_trailing(expected, "\n") ==
             SolutionGenerator.call(task, Languages.meta("golang"))
  end

  # Test for array of string input and output
  test "golang with array of string input and output" do
    task = %Runner.Task{
      asserts: [
        %{
          arguments: [["hello", "world"]],
          expected: ["world", "hello"]
        }
      ],
      input_signature: [
        %{
          argument_name: "inputArray",
          type: %{name: "array", nested: %{name: "string"}}
        }
      ],
      output_signature: %{
        type: %{name: "array", nested: %{name: "string"}}
      }
    }

    expected = """
    package main
    // import "fmt"

    func solution(inputArray []string) []string {
      var ans  []string
      return ans
    }
    // use stdout to debug
    """

    assert String.trim_trailing(expected, "\n") ==
             SolutionGenerator.call(task, Languages.meta("golang"))
  end

  # Test for hash of string input and output
  test "golang with hash of string input and output" do
    task = %Runner.Task{
      asserts: [
        %{
          arguments: [%{"key1" => "value1", "key2" => "value2"}],
          expected: %{"key1" => "value1", "key2" => "value2"}
        }
      ],
      input_signature: [
        %{
          argument_name: "inputHash",
          type: %{name: "hash", nested: %{name: "string"}}
        }
      ],
      output_signature: %{
        type: %{name: "hash", nested: %{name: "string"}}
      }
    }

    expected = """
    package main
    // import "fmt"

    func solution(inputHash map[string]string) map[string]string {
      var ans  map[string]string
      return ans
    }
    // use stdout to debug
    """

    assert String.trim_trailing(expected, "\n") ==
             SolutionGenerator.call(task, Languages.meta("golang"))
  end

  # Test for nested array input and output
  test "golang with nested array input and output" do
    task = %Runner.Task{
      asserts: [
        %{
          arguments: [[["hello", "world"], ["foo", "bar"]]],
          expected: [["world", "hello"], ["bar", "foo"]]
        }
      ],
      input_signature: [
        %{
          argument_name: "inputArray",
          type: %{name: "array", nested: %{name: "array", nested: %{name: "string"}}}
        }
      ],
      output_signature: %{
        type: %{name: "array", nested: %{name: "array", nested: %{name: "string"}}}
      }
    }

    expected = """
    package main
    // import "fmt"

    func solution(inputArray [][]string) [][]string {
      var ans  [][]string
      return ans
    }
    // use stdout to debug
    """

    assert String.trim_trailing(expected, "\n") ==
             SolutionGenerator.call(task, Languages.meta("golang"))
  end

  # Test for complex nested type
  test "golang with complex nested type input and output" do
    task = %Runner.Task{
      asserts: [
        %{
          arguments: [[%{"outer1" => %{"inner1" => ["a", "b"]}}]],
          expected: [[%{"outer1" => %{"inner1" => ["A", "B"]}}]]
        }
      ],
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

    expected = """
    package main
    // import "fmt"

    func solution(inputComplex []map[string]map[string][]string) []map[string]map[string][]string {
      var ans  []map[string]map[string][]string
      return ans
    }
    // use stdout to debug
    """

    assert String.trim_trailing(expected, "\n") ==
             SolutionGenerator.call(task, Languages.meta("golang"))
  end
end
