defmodule Runner.SolutionGeneratorTypeTests.RubyTypeTest do
  use ExUnit.Case, async: true

  alias Runner.Languages
  alias Runner.SolutionGenerator

  # Test for string input and output
  test "ruby with string input and output" do
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
    def solution(input_string)
      ans = "value"
      return ans
    end
    # use stdout to debug
    """

    assert String.trim_trailing(expected, "\n") ==
             SolutionGenerator.call(task, Languages.meta("ruby"))
  end

  # Test for integer input and output
  test "ruby with integer input and output" do
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
    def solution(input_integer)
      ans = 0
      return ans
    end
    # use stdout to debug
    """

    assert String.trim_trailing(expected, "\n") ==
             SolutionGenerator.call(task, Languages.meta("ruby"))
  end

  # Test for array of string input and output
  test "ruby with array of string input and output" do
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
    def solution(input_array)
      ans = ["value"]
      return ans
    end
    # use stdout to debug
    """

    assert String.trim_trailing(expected, "\n") ==
             SolutionGenerator.call(task, Languages.meta("ruby"))
  end

  # Test for hash of string input and output
  test "ruby with hash of string input and output" do
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
    def solution(input_hash)
      ans = {"key" => "value"}
      return ans
    end
    # use stdout to debug
    """

    assert String.trim_trailing(expected, "\n") ==
             SolutionGenerator.call(task, Languages.meta("ruby"))
  end

  # Test for nested array input and output
  test "ruby with nested array input and output" do
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
    def solution(input_array)
      ans = [["value"]]
      return ans
    end
    # use stdout to debug
    """

    assert String.trim_trailing(expected, "\n") ==
             SolutionGenerator.call(task, Languages.meta("ruby"))
  end

  # Test for complex nested type
  test "ruby with complex nested type input and output" do
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
    def solution(input_complex)
      ans = [{"key" => {"key" => ["value"]}}]
      return ans
    end
    # use stdout to debug
    """

    assert String.trim_trailing(expected, "\n") ==
             SolutionGenerator.call(task, Languages.meta("ruby"))
  end
end
