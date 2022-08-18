defmodule Codebattle.CodeCheck.SolutionGeneratorTest do
  use ExUnit.Case, async: true

  alias Codebattle.CodeCheck.SolutionGenerator
  alias Codebattle.Languages

  test "generates for clojure" do
    assert SolutionGenerator.call(
             Languages.meta("ruby"),
             %Codebattle.Task{
               input_signature: [
                 %{argument_name: "a", type: %{name: "integer"}},
                 %{argument_name: "b", type: %{name: "integer"}}
               ],
               output_signature: %{type: %{name: "integer"}}
             }
           ) == "def solution(a, b)\n\t0\nend"
  end

  test "generates for python" do
    assert SolutionGenerator.call(
             Languages.meta("python"),
             %Codebattle.Task{
               input_signature: [
                 %{argument_name: "str1", type: %{name: "string"}},
                 %{argument_name: "str2", type: %{name: "string"}}
               ],
               output_signature: %{type: %{name: "string"}}
             }
           ) == "from typing import List, Dict\n\ndef solution(str1: str, str2: str) -> str:"
  end

  test "generates for clojure floats" do
    assert SolutionGenerator.call(
             Languages.meta("clojure"),
             %Codebattle.Task{
               input_signature: [
                 %{argument_name: "a", type: %{name: "float"}},
                 %{argument_name: "b", type: %{name: "float"}}
               ],
               output_signature: %{type: %{name: "hash", nested: %{name: "float"}}}
             }
           ) == "(defn solution [a b] {:key 0.1})"
  end

  test "generates for ts floats" do
    assert SolutionGenerator.call(
             Languages.meta("ts"),
             %Codebattle.Task{
               input_signature: [
                 %{argument_name: "a", type: %{name: "float"}},
                 %{argument_name: "b", type: %{name: "float"}}
               ],
               output_signature: %{type: %{name: "hash", nested: %{name: "float"}}}
             }
           ) ==
             "import * as _ from \"lodash\";\nimport * as R from \"rambda\";\n\nfunction solution(a: number, b: number): any {\n\n};\n\nexport default solution;"
  end

  test "generates for golang floats" do
    assert SolutionGenerator.call(
             Languages.meta("golang"),
             %Codebattle.Task{
               input_signature: [
                 %{argument_name: "a", type: %{name: "float"}},
                 %{argument_name: "b", type: %{name: "float"}}
               ],
               output_signature: %{type: %{name: "hash", nested: %{name: "float"}}}
             }
           ) == "package main;\n\nfunc solution(a float64, b float64) map[string]float64 {\n\n}"
  end
end
