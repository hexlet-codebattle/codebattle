defmodule Runner.SolutionGeneratorTypeTests.CppTypeTest do
  use ExUnit.Case, async: true

  alias Runner.Languages
  alias Runner.SolutionGenerator

  # Test for string input and output
  test "cpp with string input and output" do
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
    #include <bits/stdc++.h>

    using namespace std;

    string solution(string input_string) {
      string ans;
      ans = "value";
      return ans;
    }
    // use stdout to debug
    """

    assert String.trim_trailing(expected, "\n") ==
             SolutionGenerator.call(task, Languages.meta("cpp"))
  end

  # Test for integer input and output
  test "cpp with integer input and output" do
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
    #include <bits/stdc++.h>

    using namespace std;

    int solution(int input_integer) {
      int ans;
      ans = 0;
      return ans;
    }
    // use stdout to debug
    """

    assert String.trim_trailing(expected, "\n") ==
             SolutionGenerator.call(task, Languages.meta("cpp"))
  end

  # Test for array of string input and output
  test "cpp with array of string input and output" do
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
    #include <bits/stdc++.h>

    using namespace std;

    vector<string> solution(vector<string> input_array) {
      vector<string> ans;
      ans = {"value"};
      return ans;
    }
    // use stdout to debug
    """

    assert String.trim_trailing(expected, "\n") ==
             SolutionGenerator.call(task, Languages.meta("cpp"))
  end

  # Test for hash of string input and output
  test "cpp with hash of string input and output" do
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
    #include <bits/stdc++.h>

    using namespace std;

    map<string,string> solution(map<string,string> input_hash) {
      map<string,string> ans;
      ans = {{"key", "value"}};
      return ans;
    }
    // use stdout to debug
    """

    assert String.trim_trailing(expected, "\n") ==
             SolutionGenerator.call(task, Languages.meta("cpp"))
  end

  # Test for nested array input and output
  test "cpp with nested array input and output" do
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
    #include <bits/stdc++.h>

    using namespace std;

    vector<vector<string>> solution(vector<vector<string>> input_array) {
      vector<vector<string>> ans;
      ans = {{"value"}};
      return ans;
    }
    // use stdout to debug
    """

    assert String.trim_trailing(expected, "\n") ==
             SolutionGenerator.call(task, Languages.meta("cpp"))
  end

  # Test for complex nested type
  test "cpp with complex nested type input and output" do
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
    #include <bits/stdc++.h>

    using namespace std;

    vector<map<string,map<string,vector<string>>>> solution(vector<map<string,map<string,vector<string>>>> input_complex) {
      vector<map<string,map<string,vector<string>>>> ans;
      ans = {{{"key", {{"key", {"value"}}}}}};
      return ans;
    }
    // use stdout to debug
    """

    assert String.trim_trailing(expected, "\n") ==
             SolutionGenerator.call(task, Languages.meta("cpp"))
  end
end
