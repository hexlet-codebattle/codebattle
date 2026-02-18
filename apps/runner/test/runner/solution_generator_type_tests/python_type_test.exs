defmodule Runner.SolutionGeneratorTypeTests.PythonTypeTest do
  use ExUnit.Case, async: true

  alias Runner.Languages
  alias Runner.SolutionGenerator

  # Test for string input and output
  test "python with string input and output" do
    task = %Runner.Task{
      asserts: [
        %{
          arguments: ["hello"],
          expected: "world"
        }
      ],
      input_signature: [
        %{
          argument_name: "input_string",
          type: %{name: "string"}
        }
      ],
      output_signature: %{
        type: %{name: "string"}
      }
    }

    expected = """
    from typing import List, Dict

    def solution(input_string: str) -> str:
      ans = "value"
      return ans
    # use stdout to debug
    """

    assert String.trim_trailing(expected, "\n") ==
             SolutionGenerator.call(task, Languages.meta("python"))
  end

  # Test for integer input and output
  test "python with integer input and output" do
    task = %Runner.Task{
      asserts: [
        %{
          arguments: [42],
          expected: 84
        }
      ],
      input_signature: [
        %{
          argument_name: "input_integer",
          type: %{name: "integer"}
        }
      ],
      output_signature: %{
        type: %{name: "integer"}
      }
    }

    expected = """
    from typing import List, Dict

    def solution(input_integer: int) -> int:
      ans = 0
      return ans
    # use stdout to debug
    """

    assert String.trim_trailing(expected, "\n") ==
             SolutionGenerator.call(task, Languages.meta("python"))
  end

  # Test for array of string input and output
  test "python with array of string input and output" do
    task = %Runner.Task{
      asserts: [
        %{
          arguments: [["hello", "world"]],
          expected: ["world", "hello"]
        }
      ],
      input_signature: [
        %{
          argument_name: "input_array",
          type: %{name: "array", nested: %{name: "string"}}
        }
      ],
      output_signature: %{
        type: %{name: "array", nested: %{name: "string"}}
      }
    }

    expected = """
    from typing import List, Dict

    def solution(input_array: List[str]) -> List[str]:
      ans = ["value"]
      return ans
    # use stdout to debug
    """

    assert String.trim_trailing(expected, "\n") ==
             SolutionGenerator.call(task, Languages.meta("python"))
  end

  # Test for hash of string input and output
  test "python with hash of string input and output" do
    task = %Runner.Task{
      asserts: [
        %{
          arguments: [%{"key1" => "value1", "key2" => "value2"}],
          expected: %{"key1" => "value1", "key2" => "value2"}
        }
      ],
      input_signature: [
        %{
          argument_name: "input_hash",
          type: %{name: "hash", nested: %{name: "string"}}
        }
      ],
      output_signature: %{
        type: %{name: "hash", nested: %{name: "string"}}
      }
    }

    expected = """
    from typing import List, Dict

    def solution(input_hash: Dict[str, str]) -> Dict[str, str]:
      ans = {"key": "value"}
      return ans
    # use stdout to debug
    """

    assert String.trim_trailing(expected, "\n") ==
             SolutionGenerator.call(task, Languages.meta("python"))
  end

  # Test for nested array input and output
  test "python with nested array input and output" do
    task = %Runner.Task{
      asserts: [
        %{
          arguments: [[["hello", "world"], ["foo", "bar"]]],
          expected: [["world", "hello"], ["bar", "foo"]]
        }
      ],
      input_signature: [
        %{
          argument_name: "input_array",
          type: %{name: "array", nested: %{name: "array", nested: %{name: "string"}}}
        }
      ],
      output_signature: %{
        type: %{name: "array", nested: %{name: "array", nested: %{name: "string"}}}
      }
    }

    expected = """
    from typing import List, Dict

    def solution(input_array: List[List[str]]) -> List[List[str]]:
      ans = [["value"]]
      return ans
    # use stdout to debug
    """

    assert String.trim_trailing(expected, "\n") ==
             SolutionGenerator.call(task, Languages.meta("python"))
  end

  # Test for complex nested type
  test "python with complex nested type input and output" do
    task = %Runner.Task{
      asserts: [
        %{
          arguments: [[%{"outer1" => %{"inner1" => ["a", "b"]}}]],
          expected: [[%{"outer1" => %{"inner1" => ["A", "B"]}}]]
        }
      ],
      input_signature: [
        %{
          argument_name: "input_complex",
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
    from typing import List, Dict

    def solution(input_complex: List[Dict[str, Dict[str, List[str]]]]) -> List[Dict[str, Dict[str, List[str]]]]:
      ans = [{"key": {"key": ["value"]}}]
      return ans
    # use stdout to debug
    """

    assert String.trim_trailing(expected, "\n") ==
             SolutionGenerator.call(task, Languages.meta("python"))
  end
end
