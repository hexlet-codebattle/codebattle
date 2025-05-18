defmodule Runner.SolutionGeneratorTypeTests.RustTypeTest do
  use ExUnit.Case, async: true

  alias Runner.Languages
  alias Runner.SolutionGenerator

  # Test for string input and output
  test "rust with string input and output" do
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
    use std::collections::HashMap;

    pub fn solution(input_string: String) -> String {
      let mut ans: String = String::from("value");
      return ans;
    }
    // use stdout to debug
    """

    assert String.trim_trailing(expected, "\n") ==
             SolutionGenerator.call(task, Languages.meta("rust"))
  end

  # Test for integer input and output
  test "rust with integer input and output" do
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
    use std::collections::HashMap;

    pub fn solution(input_integer: i64) -> i64 {
      let mut ans: i64 = 0;
      return ans;
    }
    // use stdout to debug
    """

    assert String.trim_trailing(expected, "\n") ==
             SolutionGenerator.call(task, Languages.meta("rust"))
  end

  # Test for array of string input and output
  test "rust with array of string input and output" do
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
    use std::collections::HashMap;

    pub fn solution(input_array: Vec<String>) -> Vec<String> {
      let mut ans: Vec<String> = vec![String::from("value")];
      return ans;
    }
    // use stdout to debug
    """

    assert String.trim_trailing(expected, "\n") ==
             SolutionGenerator.call(task, Languages.meta("rust"))
  end

  # Test for hash of string input and output
  test "rust with hash of string input and output" do
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
    use std::collections::HashMap;

    pub fn solution(input_hash: HashMap<String, String>) -> HashMap<String, String> {
      let mut ans: HashMap<String, String> = HashMap::from([(String::from("key"), String::from("value"))]);
      return ans;
    }
    // use stdout to debug
    """

    assert String.trim_trailing(expected, "\n") ==
             SolutionGenerator.call(task, Languages.meta("rust"))
  end

  # Test for nested array input and output
  test "rust with nested array input and output" do
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
    use std::collections::HashMap;

    pub fn solution(input_array: Vec<Vec<String>>) -> Vec<Vec<String>> {
      let mut ans: Vec<Vec<String>> = vec![vec![String::from("value")]];
      return ans;
    }
    // use stdout to debug
    """

    assert String.trim_trailing(expected, "\n") ==
             SolutionGenerator.call(task, Languages.meta("rust"))
  end

  # Test for complex nested type
  test "rust with complex nested type input and output" do
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
    use std::collections::HashMap;

    pub fn solution(input_complex: Vec<HashMap<String, HashMap<String, Vec<String>>>>) -> Vec<HashMap<String, HashMap<String, Vec<String>>>> {
      let mut ans: Vec<HashMap<String, HashMap<String, Vec<String>>>> = vec![HashMap::from([(String::from("key"), HashMap::from([(String::from("key"), vec![String::from("value")])]))])];
      return ans;
    }
    // use stdout to debug
    """

    assert String.trim_trailing(expected, "\n") ==
             SolutionGenerator.call(task, Languages.meta("rust"))
  end
end
