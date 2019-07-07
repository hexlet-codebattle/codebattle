defmodule Codebattle.LanguagesTest do
  use CodebattleWeb.ConnCase, async: true

  alias Codebattle.Languages

  setup _ do
    valid_signature = %{
      input_signature: [
        %{"argument-name" => "a", "type" => %{"name" => "integer"}},
        %{"argument-name" => "b", "type" => %{"name" => "float"}},
        %{"argument-name" => "text", "type" => %{"name" => "string"}},
        %{"argument-name" => "arr",
          "type" => %{"name" => "array",
                      "nested" => %{"name" => "array",
                                    "nested" => %{"name" => "integer"}}}},
        %{"argument-name" => "condition", "type" => %{"name" => "boolean"}},
        %{"argument-name" => "hashtable", "type" => %{"name" => "hash", "nested" => %{"name" => "integer"}}}
      ],
      output_signature: %{"type" => %{"name" => "array", "nested" => %{"name" => "string"}}}
    }
    empty_signature = %{input_signature: [], output_signature: %{}}
    empty_solutions = MapSet.new([
      "module.exports = () => {\n\n};",
      "function solution(){\n\n};\n\nexport default solution;",
      "def solution()\n\nend",
      "defmodule Solution do\n\tdef solution() do\n\n\tend\nend",
      "def solution():",
      "<?php\nfunction solution(){\n\n}",
      "(defn solution [] )",
      "module Check.Solution where\n\nsolution :: ()\nsolution =\n\n{- Included packages:\naeson\nbytestring\ncase-insensitive\ncontainers\ndeepseq\nfgl\ninteger-logarithms\nmegaparsec\nmtl\nparser-combinators\npretty\nrandom\nregex-base\nregex-compat\nregex-posix\nscientific\nsplit\ntemplate-haskell\ntext\ntime\ntransformers\nunordered-containers\nvector\nvector-algorithms -}",
      "sub solution {\n\n}\n1;"])
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

    js_expected = "module.exports = (a, b, text, arr, condition, hashtable) => {\n\treturn [\"value\"];\n};"
    ts_expected = "import {Hashtable} from \"./types\";\n\nfunction solution(a: number, b: number, text: string, arr: Array<Array<number>>, condition: boolean, hashtable: Hashtable): Array<string> {\n\n};\n\nexport default solution;"
    ruby_expected = "def solution(a, b, text, arr, condition, hashtable)\n\t[\"value\"]\nend"
    elixir_expected = "defmodule Solution do\n\tdef solution(a, b, text, arr, condition, hashtable) do\n\t\t[\"value\"]\n\tend\nend"
    python_expected = "def solution(a: int, b: float, text: str, arr: List[List[int]], condition: bool, hashtable: Dict[str, int]) -> List[str]:"
    php_expected = "<?php\nfunction solution($a, $b, $text, $arr, $condition, $hashtable){\n\treturn [\"value\"];\n}"
    clojure_expected = "(defn solution [a, b, text, arr, condition, hashtable] [\"value\"])"
    haskell_expected = "module Check.Solution where\n\nsolution :: (Integer, Float, String, Array (Array (Integer)), Bool, Map) -> Array (String)\nsolution =\n\n{- Included packages:\naeson\nbytestring\ncase-insensitive\ncontainers\ndeepseq\nfgl\ninteger-logarithms\nmegaparsec\nmtl\nparser-combinators\npretty\nrandom\nregex-base\nregex-compat\nregex-posix\nscientific\nsplit\ntemplate-haskell\ntext\ntime\ntransformers\nunordered-containers\nvector\nvector-algorithms -}"
    perl_expected = "sub solution {\n\n}\n1;"

    assert Languages.get_solution("js", signature) == js_expected
    assert Languages.get_solution("ts", signature) == ts_expected
    assert Languages.get_solution("ruby", signature) == ruby_expected
    assert Languages.get_solution("elixir", signature) == elixir_expected
    assert Languages.get_solution("python", signature) == python_expected
    assert Languages.get_solution("php", signature) == php_expected
    assert Languages.get_solution("clojure", signature) == clojure_expected
    assert Languages.get_solution("haskell", signature) == haskell_expected
    assert Languages.get_solution("perl", signature) == perl_expected
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
