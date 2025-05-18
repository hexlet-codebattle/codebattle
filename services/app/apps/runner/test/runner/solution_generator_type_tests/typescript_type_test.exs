defmodule Runner.SolutionGeneratorTypeTests.TypescriptTypeTest do
  use ExUnit.Case, async: true

  alias Runner.Languages
  alias Runner.SolutionGenerator

  # Test for string input and output
  test "typescript with string input and output" do
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
    import * as _ from "lodash";
    import * as R from "rambda";

    function solution(inputString: string): string {
      let ans = "value";
      return ans;
    };

    // use stdout to debug

    export default solution;
    """

    assert String.trim_trailing(expected, "\n") == 
      SolutionGenerator.call(task, Languages.meta("ts"))
  end

  # Test for integer input and output
  test "typescript with integer input and output" do
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
    import * as _ from "lodash";
    import * as R from "rambda";

    function solution(inputInteger: number): number {
      let ans = 0;
      return ans;
    };

    // use stdout to debug

    export default solution;
    """

    assert String.trim_trailing(expected, "\n") == 
      SolutionGenerator.call(task, Languages.meta("ts"))
  end

  # Test for array of string input and output
  test "typescript with array of string input and output" do
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
    import * as _ from "lodash";
    import * as R from "rambda";

    function solution(inputArray: Array<string>): Array<string> {
      let ans = ["value"];
      return ans;
    };

    // use stdout to debug

    export default solution;
    """

    assert String.trim_trailing(expected, "\n") == 
      SolutionGenerator.call(task, Languages.meta("ts"))
  end

  # Test for hash of string input and output
  test "typescript with hash of string input and output" do
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
    import * as _ from "lodash";
    import * as R from "rambda";

    function solution(inputHash: any): any {
      let ans = { key: "value" };
      return ans;
    };

    // use stdout to debug

    export default solution;
    """

    assert String.trim_trailing(expected, "\n") == 
      SolutionGenerator.call(task, Languages.meta("ts"))
  end

  # Test for nested array input and output
  test "typescript with nested array input and output" do
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
    import * as _ from "lodash";
    import * as R from "rambda";

    function solution(inputArray: Array<Array<string>>): Array<Array<string>> {
      let ans = [["value"]];
      return ans;
    };

    // use stdout to debug

    export default solution;
    """

    assert String.trim_trailing(expected, "\n") == 
      SolutionGenerator.call(task, Languages.meta("ts"))
  end

  # Test for complex nested type
  test "typescript with complex nested type input and output" do
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
          type: %{name: "array", nested: %{name: "hash", nested: %{name: "hash", nested: %{name: "array", nested: %{name: "string"}}}}}
        }
      ],
      output_signature: %{
        type: %{name: "array", nested: %{name: "hash", nested: %{name: "hash", nested: %{name: "array", nested: %{name: "string"}}}}}
      }
    }

    expected = """
    import * as _ from "lodash";
    import * as R from "rambda";

    function solution(inputComplex: Array<any>): Array<any> {
      let ans = [{ key: { key: ["value"] } }];
      return ans;
    };

    // use stdout to debug

    export default solution;
    """

    assert String.trim_trailing(expected, "\n") == 
      SolutionGenerator.call(task, Languages.meta("ts"))
  end
end
