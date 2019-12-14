defmodule Codebattle.Languages do
  @moduledoc false

  # require Logger
  alias Codebattle.Generators.SolutionTemplateGenerator

  def get_solution(lang, task) do
    meta()
    |> Map.get(lang)
    |> SolutionTemplateGenerator.get_solution(task)
  end

  def update_solutions(list_meta, task) do
    Enum.map(list_meta, fn el ->
      Map.replace!(el, :solution_template, SolutionTemplateGenerator.get_solution(el, task))
    end)
  end

  def meta do
    %{
      "ruby" => %{
        name: "ruby",
        slug: "ruby",
        version: "2.6.0",
        base_image: :ubuntu,
        check_dir: "check",
        extension: :rb,
        docker_image: "codebattle/ruby:2.6.0",
        solution_template: "def solution(<%= arguments %>)\n<%= return_statement %>\nend",
        return_template: "\t<%= default_value %>",
        default_values: %{
          "integer" => "0",
          "float" => "0.1",
          "string" => "\"value\"",
          "array" => "[<%= value %>]",
          "boolean" => "false",
          "hash" => "{\"key\" => <%= value %>}"
        }
      },
      "js" => %{
        name: "Node.js",
        slug: "js",
        version: "11.6.0",
        base_image: :ubuntu,
        check_dir: "check",
        extension: "js",
        docker_image: "codebattle/js:11.6.0",
        solution_template:
          "const _ = require(\"lodash\");\nconst R = require(\"rambda\");\n\nmodule.exports = (<%= arguments %>) => {\n<%= return_statement %>\n};",
        return_template: "\treturn <%= default_value %>;",
        default_values: %{
          "integer" => "0",
          "float" => "0.1",
          "string" => "\"value\"",
          "array" => "[<%= value %>]",
          "boolean" => "true",
          "hash" => "{\"key\": <%= value %>}"
        }
      },
      "ts" => %{
        name: "typescript",
        slug: "ts",
        version: "3.5.2",
        base_image: :ubuntu,
        check_dir: "check",
        extension: "ts",
        docker_image: "codebattle/ts:3.5.2",
        solution_template:
          "<%= import %>function solution(<%= arguments %>)<%= expected %>{\n\n};\n\nexport default solution;",
        types: %{
          "integer" => "number",
          "float" => "number",
          "string" => "string",
          "array" => "Array<<%= inner_type %>>",
          "boolean" => "boolean",
          "hash" => "any"
        }
      },
      "cpp" => %{
        name: "C++",
        slug: "cpp",
        version: "17",
        base_image: :alpine,
        check_dir: "check",
        extension: "cpp",
        docker_image: "codebattle/cpp:17",
        solution_template:
          "package main;\n\nfunc solution(<%= arguments %>)<%= expected %> {\n\n}",
        types: %{
          "integer" => "int64",
          "float" => "float64",
          "string" => "string",
          "array" => "[]<%= inner_type %>",
          "boolean" => "bool",
          "hash" => "map[string]<%= inner_type %>"
        }
      },
      "golang" => %{
        name: "golang",
        slug: "golang",
        version: "1.12.6",
        base_image: :ubuntu,
        check_dir: "check",
        extension: "go",
        docker_image: "codebattle/golang:1.12.6",
        solution_template:
          "package main;\n\nfunc solution(<%= arguments %>)<%= expected %> {\n\n}",
        types: %{
          "integer" => "int64",
          "float" => "float64",
          "string" => "string",
          "array" => "[]<%= inner_type %>",
          "boolean" => "bool",
          "hash" => "map[string]<%= inner_type %>"
        }
      },
      "elixir" => %{
        name: "elixir",
        slug: "elixir",
        version: "1.7.3",
        base_image: :alpine,
        check_dir: "check",
        extension: "exs",
        docker_image: "codebattle/elixir:1.7.3",
        solution_template:
          "defmodule Solution do\n\tdef solution(<%= arguments %>) do\n<%= return_statement %>\n\tend\nend",
        return_template: "\t\t<%= default_value %>",
        default_values: %{
          "integer" => "0",
          "float" => "0.1",
          "string" => "\"value\"",
          "array" => "[<%= value %>]",
          "boolean" => "false",
          "hash" => "%{\"key\": <%= value %>}"
        }
      },
      "python" => %{
        name: "python",
        slug: "python",
        version: "3.7.2",
        base_image: :ubuntu,
        check_dir: "check",
        extension: "py",
        docker_image: "codebattle/python:3.7.2",
        solution_template:
          "from typing import List, Dict\n\ndef solution(<%= arguments %>)<%= expected %>:",
        types: %{
          "integer" => "int",
          "float" => "float",
          "string" => "str",
          "array" => "List[<%= inner_type %>]",
          "boolean" => "bool",
          "hash" => "Dict[str, <%= inner_type %>]"
        }
      },
      "php" => %{
        name: "php",
        slug: "php",
        version: "7.3.0",
        base_image: :ubuntu,
        check_dir: "check",
        extension: "php",
        docker_image: "codebattle/php:7.3.0",
        solution_template:
          "<?php\nfunction solution(<%= arguments %>){\n<%= return_statement %>\n}",
        return_template: "\treturn <%= default_value %>;",
        default_values: %{
          "integer" => "0",
          "float" => "0.1",
          "string" => "\"value\"",
          "array" => "[<%= value %>]",
          "boolean" => "False",
          "hash" => "array(\"key\" => <%= value %>)"
        }
      },
      "clojure" => %{
        name: "clojure",
        slug: "clojure",
        version: "1.10.0",
        base_image: :ubuntu,
        check_dir: "check",
        extension: "clj",
        docker_image: "codebattle/clojure:1.10.0",
        solution_template: "(defn solution [<%= arguments %>] <%= return_statement %>)",
        return_template: "<%= default_value %>",
        default_values: %{
          "integer" => "0",
          "float" => "0.1",
          "string" => "\"value\"",
          "array" => "[<%= value %>]",
          "boolean" => "false",
          "hash" => "{:key <%= value %>}"
        }
      },
      "haskell" => %{
        name: "haskell",
        slug: "haskell",
        version: "8.4.3",
        base_image: :ubuntu,
        extension: "hs",
        check_dir: "Check",
        docker_image: "codebattle/haskell:8.4.3",
        solution_template:
          "module Check.Solution where\n\nimport Data.HashMap.Lazy\n\nsolution :: <%= arguments %><%= expected %>\nsolution =\n\n{- Included packages:\naeson\nbytestring\ncase-insensitive\ncontainers\ndeepseq\nfgl\ninteger-logarithms\nmegaparsec\nmtl\nparser-combinators\npretty\nrandom\nregex-base\nregex-compat\nregex-posix\nscientific\nsplit\ntemplate-haskell\ntext\ntime\ntransformers\nunordered-containers\nvector\nvector-algorithms -}",
        types: %{
          "integer" => "Int",
          "float" => "Double",
          "string" => "String",
          "array" => "[<%= inner_type %>]",
          "boolean" => "Bool",
          "hash" => "HashMap String <%= inner_type %>"
        }
      },
      "perl" => %{
        name: "perl",
        slug: "perl",
        version: "5.26.2",
        base_image: :ubuntu,
        check_dir: "check",
        extension: "pl",
        docker_image: "codebattle/perl:5.26.2",
        solution_template: "sub solution {\n\n}\n1;"
      }
    }
  end
end
