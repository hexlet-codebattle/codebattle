defmodule Runner.SolutionGeneratorTypeTests.JsTypeTest do
  use ExUnit.Case, async: true

  alias Runner.Languages
  alias Runner.SolutionGenerator

  # Test for string input and output
  test "js with string input and output" do
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
    const _ = require("lodash");
    const R = require("rambda");

    const solution = (inputString) => {
      let ans = "value";

      return ans;
    };
    // use stdout to debug

    module.exports = solution;
    """

    assert String.trim_trailing(expected, "\n") ==
             SolutionGenerator.call(task, Languages.meta("js"))
  end

  # Test for integer input and output
  test "js with integer input and output" do
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
    const _ = require("lodash");
    const R = require("rambda");

    const solution = (inputInteger) => {
      let ans = 0;

      return ans;
    };
    // use stdout to debug

    module.exports = solution;
    """

    assert String.trim_trailing(expected, "\n") ==
             SolutionGenerator.call(task, Languages.meta("js"))
  end

  # Test for array of string input and output
  test "js with array of string input and output" do
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
    const _ = require("lodash");
    const R = require("rambda");

    const solution = (inputArray) => {
      let ans = ["value"];

      return ans;
    };
    // use stdout to debug

    module.exports = solution;
    """

    assert String.trim_trailing(expected, "\n") ==
             SolutionGenerator.call(task, Languages.meta("js"))
  end

  # Test for hash of string input and output
  test "js with hash of string input and output" do
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
    const _ = require("lodash");
    const R = require("rambda");

    const solution = (inputHash) => {
      let ans = {"key": "value"};

      return ans;
    };
    // use stdout to debug

    module.exports = solution;
    """

    assert String.trim_trailing(expected, "\n") ==
             SolutionGenerator.call(task, Languages.meta("js"))
  end

  # Test for nested array input and output
  test "js with nested array input and output" do
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
    const _ = require("lodash");
    const R = require("rambda");

    const solution = (inputArray) => {
      let ans = [["value"]];

      return ans;
    };
    // use stdout to debug

    module.exports = solution;
    """

    assert String.trim_trailing(expected, "\n") ==
             SolutionGenerator.call(task, Languages.meta("js"))
  end

  # Test for complex nested type
  test "js with complex nested type input and output" do
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
    const _ = require("lodash");
    const R = require("rambda");

    const solution = (inputComplex) => {
      let ans = [{"key": {"key": ["value"]}}];

      return ans;
    };
    // use stdout to debug

    module.exports = solution;
    """

    assert String.trim_trailing(expected, "\n") ==
             SolutionGenerator.call(task, Languages.meta("js"))
  end
end
