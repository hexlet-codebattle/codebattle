defmodule Runner.SolutionGeneratorTypeTests.JavaTypeTest do
  use ExUnit.Case, async: true

  alias Runner.Languages
  alias Runner.SolutionGenerator

  # Test for string input and output
  test "java with string input and output" do
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
    package solution;

    import java.util.*;
    import java.util.stream.*;

    public class Solution {
      public String solution(String inputString) {
        String ans = "value";
        return ans;
      }
    }
    // use stdout to debug
    """

    assert String.trim_trailing(expected, "\n") == 
      SolutionGenerator.call(task, Languages.meta("java"))
  end

  # Test for integer input and output
  test "java with integer input and output" do
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
    package solution;

    import java.util.*;
    import java.util.stream.*;

    public class Solution {
      public Integer solution(Integer inputInteger) {
        Integer ans = 0;
        return ans;
      }
    }
    // use stdout to debug
    """

    assert String.trim_trailing(expected, "\n") == 
      SolutionGenerator.call(task, Languages.meta("java"))
  end

  # Test for array of string input and output
  test "java with array of string input and output" do
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
    package solution;

    import java.util.*;
    import java.util.stream.*;

    public class Solution {
      public List<String> solution(List<String> inputArray) {
        List<String> ans = List.of("value");
        return ans;
      }
    }
    // use stdout to debug
    """

    assert String.trim_trailing(expected, "\n") == 
      SolutionGenerator.call(task, Languages.meta("java"))
  end

  # Test for hash of string input and output
  test "java with hash of string input and output" do
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
    package solution;

    import java.util.*;
    import java.util.stream.*;

    public class Solution {
      public Map<String, String> solution(Map<String, String> inputHash) {
        Map<String, String> ans = Map.of("key", "value");
        return ans;
      }
    }
    // use stdout to debug
    """

    assert String.trim_trailing(expected, "\n") == 
      SolutionGenerator.call(task, Languages.meta("java"))
  end

  # Test for nested array input and output
  test "java with nested array input and output" do
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
    package solution;

    import java.util.*;
    import java.util.stream.*;

    public class Solution {
      public List<List<String>> solution(List<List<String>> inputArray) {
        List<List<String>> ans = List.of(List.of("value"));
        return ans;
      }
    }
    // use stdout to debug
    """

    assert String.trim_trailing(expected, "\n") == 
      SolutionGenerator.call(task, Languages.meta("java"))
  end

  # Test for complex nested type
  test "java with complex nested type input and output" do
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
    package solution;

    import java.util.*;
    import java.util.stream.*;

    public class Solution {
      public List<Map<String, Map<String, List<String>>>> solution(List<Map<String, Map<String, List<String>>>> inputComplex) {
        List<Map<String, Map<String, List<String>>>> ans = List.of(Map.of("key", Map.of("key", List.of("value"))));
        return ans;
      }
    }
    // use stdout to debug
    """

    assert String.trim_trailing(expected, "\n") == 
      SolutionGenerator.call(task, Languages.meta("java"))
  end
end
