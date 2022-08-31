defmodule Codebattle.CodeCheck.SolutionGeneratorTest do
  use ExUnit.Case, async: true

  import CodebattleWeb.Factory
  alias Codebattle.CodeCheck.SolutionGenerator
  alias Codebattle.Languages

  @clojure_expected "(defn solution [a text b c nested_hash_of_string nested_array_of_string nested_array_of_array_of_strings] [\"value\"])"
  @cpp_expected String.trim("""
                #include <iostream>
                #include <map>
                #include <vector>

                using namespace std;

                vector<string> solution(int a, string text, double b, bool c, map<string,string> nested_hash_of_string, vector<string> nested_array_of_string, vector<vector<string>> nested_array_of_array_of_strings) {

                }
                """)

  @csharp_expected String.trim("""
                   using System;using System.Collections.Generic;

                   namespace app
                   {
                   \tpublic class Solution
                   \t{
                   \t\tpublic List<string> solution(int a, string text, double b, bool c, Dictionary<string, string> nested_hash_of_string, List<string> nested_array_of_string, List<List<string>> nested_array_of_array_of_strings)
                   \t\t{

                   \t\t}
                   \t}
                   }
                   """)

  @dart_expected "List<String> solution(int a, String text, double b, bool c, Map<String, String> nested_hash_of_string, List<String> nested_array_of_string, List<List<String>> nested_array_of_array_of_strings) {\n\n}"
  @elixir_expected String.trim("""
                   defmodule Solution do
                   \tdef solution(a, text, b, c, nested_hash_of_string, nested_array_of_string, nested_array_of_array_of_strings) do
                   \t\t[\"value\"]
                   \tend
                   end
                   """)

  @golang_expected String.trim("""
                   package main;

                   func solution(a int64, text string, b float64, c bool, nested_hash_of_string map[string]string, nested_array_of_string []string, nested_array_of_array_of_strings [][]string) []string {

                   }
                   """)

  @haskell_expected String.trim("""
                    module Check.Solution where

                    import qualified Data.HashMap.Lazy as HM

                    solution :: Int -> String -> Double -> Bool -> HM.HashMap String String -> [String] -> [[String]] -> [String]
                    solution =

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
                    vector-algorithms -}
                    """)

  @java_expected String.trim("""
                 package solution;

                 import java.util.*;import java.util.stream.*;

                 public class Solution {
                 \tpublic List<String> solution(Integer a, String text, Double b, Boolean c, Map<String, String> nested_hash_of_string, List<String> nested_array_of_string, List<List<String>> nested_array_of_array_of_strings) {

                 \t}
                 }
                 """)

  @js_expected String.trim("""
               const _ = require(\"lodash\");
               const R = require(\"rambda\");

               const solution = (a, text, b, c, nested_hash_of_string, nested_array_of_string, nested_array_of_array_of_strings) => {
               \treturn [\"value\"];
               };

               module.exports = solution;
               """)

  @kotlin_expected String.trim("""
                   package solution

                   import kotlin.collections.*

                   fun solution(a: Int, text: String, b: Double, c: Boolean, nested_hash_of_string: Map<String, String>, nested_array_of_string: List<String>, nested_array_of_array_of_strings: List<List<String>>): List<String> {

                   }
                   """)

  @php_expected String.trim("""
                <?php

                function solution(int $a, string $text, float $b, bool $c, array $nested_hash_of_string, array $nested_array_of_string, array $nested_array_of_array_of_strings)
                {
                \treturn [\"value\"];
                }
                """)

  @python_expected String.trim("""
                   from typing import List, Dict

                   def solution(a: int, text: str, b: float, c: bool, nested_hash_of_string: Dict[str, str], nested_array_of_string: List[str], nested_array_of_array_of_strings: List[List[str]]) -> List[str]:
                   """)

  @ruby_expected "def solution(a, text, b, c, nested_hash_of_string, nested_array_of_string, nested_array_of_array_of_strings)\n\t[\"value\"]\nend"
  @ts_expected String.trim("""
               import * as _ from \"lodash\";
               import * as R from \"rambda\";

               function solution(a: number, text: string, b: number, c: boolean, nested_hash_of_string: any, nested_array_of_string: Array<string>, nested_array_of_array_of_strings: Array<Array<string>>): Array<string> {

               };

               export default solution;
               """)

  setup do
    task = build(:task_with_all_data_types)
    %{task: task}
  end

  test "check solutions for task", %{task: task} do
    assert get_solution("clojure", task) == @clojure_expected
    assert get_solution("cpp", task) == @cpp_expected
    assert get_solution("csharp", task) == @csharp_expected
    assert get_solution("dart", task) == @dart_expected
    assert get_solution("elixir", task) == @elixir_expected
    assert get_solution("golang", task) == @golang_expected
    assert get_solution("haskell", task) == @haskell_expected
    assert get_solution("java", task) == @java_expected
    assert get_solution("js", task) == @js_expected
    assert get_solution("kotlin", task) == @kotlin_expected
    assert get_solution("php", task) == @php_expected
    assert get_solution("python", task) == @python_expected
    assert get_solution("ruby", task) == @ruby_expected
    assert get_solution("ts", task) == @ts_expected
  end

  def get_solution(lang, task) do
    SolutionGenerator.call(Languages.meta(lang), task)
  end
end
