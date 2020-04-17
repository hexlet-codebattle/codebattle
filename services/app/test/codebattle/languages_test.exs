defmodule Codebattle.LanguagesTest do
  use CodebattleWeb.ConnCase, async: true

  alias Codebattle.Languages

  setup _ do
    valid_signature = %{
      input_signature: [
        %{"argument-name" => "a", "type" => %{"name" => "integer"}},
        %{"argument-name" => "b", "type" => %{"name" => "float"}},
        %{"argument-name" => "text", "type" => %{"name" => "string"}},
        %{
          "argument-name" => "arr",
          "type" => %{
            "name" => "array",
            "nested" => %{"name" => "array", "nested" => %{"name" => "integer"}}
          }
        },
        %{"argument-name" => "condition", "type" => %{"name" => "boolean"}},
        %{
          "argument-name" => "hashtable",
          "type" => %{"name" => "hash", "nested" => %{"name" => "integer"}}
        }
      ],
      output_signature: %{"type" => %{"name" => "array", "nested" => %{"name" => "string"}}}
    }

    empty_signature = %{input_signature: [], output_signature: %{}}

    empty_solutions =
      MapSet.new([
        "#include <iostream>\n#include <map>\n#include <vector>\n\nusing namespace std;\n\n solution() {\n\n}",
        "const _ = require(\"lodash\");\nconst R = require(\"rambda\");\n\nconst solution = () => {\n\n};\n\nmodule.exports = solution;",
        "solution() {\n\n}",
        "import * as _ from \"lodash\";\nfunction solution(){\n\n};\n\nexport default solution;",
        "package main;\n\nfunc solution() {\n\n}",
        "package solution;\n\nimport java.util.*;\n\npublic class Solution {\n\tpublic solution() {\n\n\t}\n}",
        "package solution\n\nimport kotlin.collections.*\n\nfun solution(): {\n\n}",
        "def solution()\n\nend",
        "defmodule Solution do\n\tdef solution() do\n\n\tend\nend",
        "from typing import List, Dict\n\ndef solution():",
        "<?php\nfunction solution(){\n\n}",
        "(defn solution [] )",
        "module Check.Solution where\n\nimport Data.HashMap.Lazy\n\nsolution :: \nsolution =\n\n{- Included packages:\naeson\nbytestring\ncase-insensitive\ncontainers\ndeepseq\nfgl\ninteger-logarithms\nmegaparsec\nmtl\nparser-combinators\npretty\nrandom\nregex-base\nregex-compat\nregex-posix\nscientific\nsplit\ntemplate-haskell\ntext\ntime\ntransformers\nunordered-containers\nvector\nvector-algorithms -}"
      ])

    %{
      valid_signature: valid_signature,
      empty_signature: empty_signature,
      empty_solutions: empty_solutions
    }
  end

  test "check solutions for valid signature", %{
    valid_signature: signature,
    empty_signature: _,
    empty_solutions: _
  } do
    js_expected =
      "const _ = require(\"lodash\");\nconst R = require(\"rambda\");\n\nconst solution = (a, b, text, arr, condition, hashtable) => {\n\treturn [\"value\"];\n};\n\nmodule.exports = solution;"

    ts_expected =
      "import * as _ from \"lodash\";\nimport {Hashtable} from \"./types\";\n\nfunction solution(a: number, b: number, text: string, arr: Array<Array<number>>, condition: boolean, hashtable: Hashtable): Array<string> {\n\n};\n\nexport default solution;"

    dart_expected =
      "List<String> solution(int a, double b, String text, List<List<int>> arr, bool condition, Map<String, int> hashtable) {\n\n}"

    golang_expected =
      "package main;\n\nfunc solution(a int64, b float64, text string, arr [][]int64, condition bool, hashtable map[string]int64) []string {\n\n}"

    ruby_expected = "def solution(a, b, text, arr, condition, hashtable)\n\t[\"value\"]\nend"

    elixir_expected =
      "defmodule Solution do\n\tdef solution(a, b, text, arr, condition, hashtable) do\n\t\t[\"value\"]\n\tend\nend"

    python_expected =
      "from typing import List, Dict\n\ndef solution(a: int, b: float, text: str, arr: List[List[int]], condition: bool, hashtable: Dict[str, int]) -> List[str]:"

    php_expected =
      "<?php\nfunction solution($a, $b, $text, $arr, $condition, $hashtable){\n\treturn [\"value\"];\n}"

    clojure_expected = "(defn solution [a b text arr condition hashtable] [\"value\"])"

    haskell_expected =
      "module Check.Solution where\n\nimport Data.HashMap.Lazy\n\nsolution :: Int -> Double -> String -> [[Int]] -> Bool -> HashMap String Int -> [String]\nsolution =\n\n{- Included packages:\naeson\nbytestring\ncase-insensitive\ncontainers\ndeepseq\nfgl\ninteger-logarithms\nmegaparsec\nmtl\nparser-combinators\npretty\nrandom\nregex-base\nregex-compat\nregex-posix\nscientific\nsplit\ntemplate-haskell\ntext\ntime\ntransformers\nunordered-containers\nvector\nvector-algorithms -}"

    cpp_expected =
      "#include <iostream>\n#include <map>\n#include <vector>\n\nusing namespace std;\n\nvector<string> solution(int a, double b, string text, vector<vector<int>> arr, bool condition, map<string,int> hashtable) {\n\n}"

    java_expected =
      "package solution;\n\nimport java.util.*;\n\npublic class Solution {\n\tpublic List<String> solution(Integer a, Double b, String text, List<List<Integer>> arr, Boolean condition, Map<String, Integer> hashtable) {\n\n\t}\n}"

    kotlin_expected =
      "package solution\n\nimport kotlin.collections.*\n\nfun solution(a: Int, b: Double, text: String, arr: List<List<Int>>, condition: Boolean, hashtable: Map<String, Int>): List<String> {\n\n}"

    assert Languages.get_solution("js", signature) == js_expected
    assert Languages.get_solution("ts", signature) == ts_expected
    assert Languages.get_solution("dart", signature) == dart_expected
    assert Languages.get_solution("golang", signature) == golang_expected
    assert Languages.get_solution("ruby", signature) == ruby_expected
    assert Languages.get_solution("elixir", signature) == elixir_expected
    assert Languages.get_solution("python", signature) == python_expected
    assert Languages.get_solution("php", signature) == php_expected
    assert Languages.get_solution("clojure", signature) == clojure_expected
    assert Languages.get_solution("haskell", signature) == haskell_expected
    assert Languages.get_solution("cpp", signature) == cpp_expected
    assert Languages.get_solution("java", signature) == java_expected
    assert Languages.get_solution("kotlin", signature) == kotlin_expected
  end

  test "check solutions for empty signature", %{
    valid_signature: _,
    empty_signature: signature,
    empty_solutions: expected
  } do
    meta = Languages.meta()

    solutions =
      meta
      |> Map.to_list()
      |> Enum.map(fn {lang, _} -> Languages.get_solution(lang, signature) end)
      |> MapSet.new()

    assert MapSet.equal?(solutions, expected)
  end
end
