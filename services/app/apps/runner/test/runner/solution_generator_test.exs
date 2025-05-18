defmodule Runner.SolutionGeneratorTest do
  use ExUnit.Case, async: true

  alias Runner.Languages
  alias Runner.SolutionGenerator

  @clojure_expected """
  (defn solution [a text b c nested_hash_of_string nested_array_of_string nested_array_of_array_of_strings]
    ["value"]
  )
  ; use stdout to debug
  """
  @cpp_expected """
  #include <bits/stdc++.h>

  using namespace std;

  vector<string> solution(int a, string text, double b, bool c, map<string,string> nested_hash_of_string, vector<string> nested_array_of_string, vector<vector<string>> nested_array_of_array_of_strings) {
    vector<string> ans;
    ans = {"value"};
    return ans;
  }
  // use stdout to debug
  """
  @csharp_expected """
  using System;
  using System.Collections.Generic;

  namespace app
  {
    public class Solution
    {
      public List<string> solution(int a, string text, double b, bool c, Dictionary<string, string> nested_hash_of_string, List<string> nested_array_of_string, List<List<string>> nested_array_of_array_of_strings)
      {
        List<string> ans = new();
        return ans;
      }
    }
  }
  // use stdout to debug
  """

  @dart_expected """
  List<String> solution(int a, String text, double b, bool c, Map<String, String> nested_hash_of_string, List<String> nested_array_of_string, List<List<String>> nested_array_of_array_of_strings) {
    List<String> ans = ["value"];
    return ans;
  }
  // use stdout to debug
  """

  @elixir_expected """
  defmodule Solution do
    def solution(a, text, b, c, nested_hash_of_string, nested_array_of_string, nested_array_of_array_of_strings) do
      ans = ["value"]
      ans
    end
  end
  # use stdout to debug
  """

  @golang_expected """
  package main
  // import "fmt"

  func solution(a int64, text string, b float64, c bool, nested_hash_of_string map[string]string, nested_array_of_string []string, nested_array_of_array_of_strings [][]string) []string {
    var ans  []string
    return ans
  }
  // use stdout to debug
  """

  @haskell_expected """
  module Solution where

  import qualified Data.HashMap.Lazy as HM

  solution :: Int -> String -> Double -> Bool -> HM.HashMap String String -> [String] -> [[String]] -> [String]
  solution a text b c nested_hash_of_string nested_array_of_string nested_array_of_array_of_strings =

  -- use stdout to debug
  {- Included packages:
    aeson
    bytestring
    case-insensitive
    containers
    deepseq
    fgl
    integer-logarithms
    megaparsec
    mtl
    parser-combinators
    pretty
    random
    regex-base
    regex-compat
    regex-posix
    scientific
    split
    template-haskell
    text
    time
    transformers
    unordered-containers
    vector
    vector-algorithms
  -}
  """

  @java_expected """
  package solution;

  import java.util.*;
  import java.util.stream.*;

  public class Solution {
    public List<String> solution(Integer a, String text, Double b, Boolean c, Map<String, String> nested_hash_of_string, List<String> nested_array_of_string, List<List<String>> nested_array_of_array_of_strings) {
      List<String> ans = List.of("value");
      return ans;
    }
  }
  // use stdout to debug
  """

  @js_expected """
  const _ = require("lodash");
  const R = require("rambda");

  const solution = (a, text, b, c, nested_hash_of_string, nested_array_of_string, nested_array_of_array_of_strings) => {
    let ans = ["value"];

    return ans;
  };
  // use stdout to debug

  module.exports = solution;
  """

  @kotlin_expected """
  package solution

  import kotlin.collections.*

  fun solution(a: Int, text: String, b: Double, c: Boolean, nested_hash_of_string: Map<String, String>, nested_array_of_string: List<String>, nested_array_of_array_of_strings: List<List<String>>): List<String> {
    val ans:  List<String> = listOf("value")
    return ans
  }
  // use stdout to debug
  """

  @php_expected """
  <?php

  function solution(int $a, string $text, float $b, bool $c, array $nested_hash_of_string, array $nested_array_of_string, array $nested_array_of_array_of_strings) {
    $ans = ["value"];
    return $ans;
  }
  // use stdout to debug
  """

  @python_expected """
  from typing import List, Dict

  def solution(a: int, text: str, b: float, c: bool, nested_hash_of_string: Dict[str, str], nested_array_of_string: List[str], nested_array_of_array_of_strings: List[List[str]]) -> List[str]:
    ans = ["value"]
    return ans
  # use stdout to debug
  """

  @ruby_expected """
  def solution(a, text, b, c, nested_hash_of_string, nested_array_of_string, nested_array_of_array_of_strings)
    ans = ["value"]
    return ans
  end
  # use stdout to debug
  """

  @rust_expected """
  use std::collections::HashMap;

  pub fn solution(a: i64, text: String, b: f64, c: bool, nested_hash_of_string: HashMap<String, String>, nested_array_of_string: Vec<String>, nested_array_of_array_of_strings: Vec<Vec<String>>) -> Vec<String> {
    let mut ans: Vec<String> = vec![String::from("value")];
    return ans;
  }
  // use stdout to debug
  """
  @ts_expected """
  import * as _ from "lodash";
  import * as R from "rambda";

  function solution(a: number, text: string, b: number, c: boolean, nested_hash_of_string: any, nested_array_of_string: Array<string>, nested_array_of_array_of_strings: Array<Array<string>>): Array<string> {
    let ans = ["value"];
    return ans;
  };

  // use stdout to debug

  export default solution;
  """
  @swift_expected """
  import Foundation

  func solution(_ a: Int, _ text: String, _ b: Double, _ c: Bool, _ nested_hash_of_string: [String: String], _ nested_array_of_string: [String], _ nested_array_of_array_of_strings: [[String]]) -> [String] {
    let ans: [String] = ["value"]
    return ans
  }
  // use stdout to debug
  """

  setup do
    task = %Runner.Task{
      asserts: [
        %{
          arguments: [1, "a", 1.3, true, %{a: "b", c: "d"}, ["d", "e"], [["Jack", "Alice"]]],
          expected: ["asdf"]
        }
      ],
      input_signature: [
        %{
          argument_name: "a",
          type: %{name: "integer"}
        },
        %{
          argument_name: "text",
          type: %{name: "string"}
        },
        %{
          argument_name: "b",
          type: %{name: "float"}
        },
        %{
          argument_name: "c",
          type: %{name: "boolean"}
        },
        %{
          argument_name: "nested_hash_of_string",
          type: %{name: "hash", nested: %{name: "string"}}
        },
        %{
          argument_name: "nested_array_of_string",
          type: %{name: "array", nested: %{name: "string"}}
        },
        %{
          argument_name: "nested_array_of_array_of_strings",
          type: %{
            name: "array",
            nested: %{name: "array", nested: %{name: "string"}}
          }
        }
      ],
      output_signature: %{
        type: %{name: "array", nested: %{name: "string"}}
      }
    }

    %{task: task}
  end

  test "check solutions for task", %{task: task} do
    assert_solution(@clojure_expected, "clojure", task)
    assert_solution(@cpp_expected, "cpp", task)
    assert_solution(@csharp_expected, "csharp", task)
    assert_solution(@dart_expected, "dart", task)
    assert_solution(@elixir_expected, "elixir", task)
    assert_solution(@golang_expected, "golang", task)
    assert_solution(@haskell_expected, "haskell", task)
    assert_solution(@java_expected, "java", task)
    assert_solution(@js_expected, "js", task)
    assert_solution(@kotlin_expected, "kotlin", task)
    assert_solution(@php_expected, "php", task)
    assert_solution(@python_expected, "python", task)
    assert_solution(@ruby_expected, "ruby", task)
    assert_solution(@rust_expected, "rust", task)
    assert_solution(@swift_expected, "swift", task)
    assert_solution(@ts_expected, "ts", task)
  end

  def assert_solution(exptected_soluiton, lang, task) do
    assert String.trim_trailing(exptected_soluiton, "\n") ==
             SolutionGenerator.call(task, Languages.meta(lang))
  end
end
