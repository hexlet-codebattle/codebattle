defmodule Codebattle.Languages do
  @moduledoc false

  def meta do
    %{
      "ruby" => %{
        name: "ruby",
        slug: "ruby",
        version: "2.5.1",
        extension: :rb,
        docker_image: "codebattle/ruby:2.5.1",
        solution_template: "def solution()\n\nend"
      },
      "js" => %{
        name: "Node.js",
        slug: "js",
        version: "10.11.0",
        extension: "js",
        docker_image: "codebattle/js:10.11.0",
        solution_template: "module.exports = () => {\n\n};"
      },
      "elixir" => %{
        name: "elixir",
        slug: "elixir",
        version: "1.7.3",
        extension: "exs",
        docker_image: "codebattle/elixir:1.7.3",
        solution_template: "defmodule Solution\n  def solution() do\n  \n  end\nend"
      },
      "python" => %{
        name: "python",
        slug: "python",
        version: "3.7.0",
        extension: "py",
        docker_image: "codebattle/python:3.7.0",
        solution_template: "def solution():"
      },
      "php" => %{
        name: "php",
        slug: "php",
        version: "7.2.0",
        extension: "php",
        docker_image: "codebattle/php:7.2.0",
        solution_template: "function solution(){\n\n}"
      },
      "clojure" => %{
        name: "clojure",
        slug: "clojure",
        version: "1.8.0",
        extension: "clj",
        docker_image: "codebattle/clojure:1.8.0",
        solution_template: "(defn solution [])"
      },
      "haskell" => %{
        name: "haskell",
        slug: "haskell",
        version: "8.4.3",
        extension: "hs",
        docker_image: "codebattle/haskell:8.4.3",
        solution_template:
          "module Check.Solution where\n\nsolution ::\nsolution =\n\n{- Included packages:\naeson\nbytestring\ncase-insensitive\ncontainers\ndeepseq\nfgl\ninteger-logarithms\nmegaparsec\nmtl\nparser-combinators\npretty\nrandom\nregex-base\nregex-compat\nregex-posix\nscientific\nsplit\ntemplate-haskell\ntext\ntime\ntransformers\nunordered-containers\nvector\nvector-algorithms -}"
      },
      "perl" => %{
        name: "perl",
        slug: "perl",
        version: "5.26.2",
        extension: "pl",
        docker_image: "codebattle/perl:5.26.2",
        solution_template: "sub solution {\n\n}\n1;"
      }
    }
  end
end
