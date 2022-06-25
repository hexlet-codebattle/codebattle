defmodule Codebattle.Languages do
  @moduledoc false

  alias Codebattle.Generators.SolutionTemplateGenerator

  def get_solution(lang, task) do
    meta()
    |> Map.get(lang)
    |> SolutionTemplateGenerator.get_solution(task)
  end

  def get_langs() do
    meta()
    |> Map.values()
    |> Enum.map(fn el -> Map.get(el, :slug) end)
  end

  def get_langs_with_solutions(task) do
    meta()
    |> Map.values()
    |> Enum.map(fn el ->
      Map.replace!(el, :solution_template, SolutionTemplateGenerator.get_solution(el, task))
    end)
  end

  defmodule TypeTemplates do
    @derive Jason.Encoder

    defstruct boolean_true: "true",
              boolean_false: "false",
              array: "[<%= entries %>]",
              hash_empty: "{}",
              hash_value: "{<%= entries %>}",
              hash_inners: "\"<%= key %>\": <%= value %>"
  end

  def meta do
    %{
      "ruby" => %{
        name: "ruby",
        slug: "ruby",
        checker_version: 2,
        version: "3.1.1",
        base_image: :ubuntu,
        check_dir: "check",
        extension: "rb",
        docker_image: "codebattle/ruby:3.1.1",
        solution_version: :default,
        solution_template: "def solution(<%= arguments %>)\n<%= return_statement %>\nend",
        arguments_template: %{
          argument: "<%= name %>",
          delimeter: ", "
        },
        return_template: "\t<%= default_value %>",
        default_values: %{
          "integer" => "0",
          "float" => "0.1",
          "string" => "\"value\"",
          "array" => "[<%= value %>]",
          "boolean" => "false",
          "hash" => "{\"key\" => <%= value %>}"
        },
        checker_meta: %{
          version: :dynamic,
          arguments_delimeter: ", ",
          type_templates: %TypeTemplates{
            hash_inners: "\"<%= key %>\" => <%= value %>"
          }
        }
      },
      "js" => %{
        checker_version: 2,
        name: "Node.js",
        slug: "js",
        version: "16.15",
        base_image: :ubuntu,
        check_dir: "check",
        extension: "js",
        docker_image: "codebattle/js:16.15",
        solution_version: :default,
        solution_template:
          "const _ = require(\"lodash\");\nconst R = require(\"rambda\");\n\nconst solution = (<%= arguments %>) => {\n<%= return_statement %>\n};\n\nmodule.exports = solution;",
        arguments_template: %{
          argument: "<%= name %>",
          delimeter: ", "
        },
        return_template: "\treturn <%= default_value %>;",
        default_values: %{
          "integer" => "0",
          "float" => "0.1",
          "string" => "\"value\"",
          "array" => "[<%= value %>]",
          "boolean" => "true",
          "hash" => "{\"key\": <%= value %>}"
        },
        checker_meta: %{
          version: :dynamic,
          arguments_delimeter: ", ",
          type_templates: %TypeTemplates{}
        }
      },
      "ts" => %{
        checker_version: 2,
        name: "typescript",
        slug: "ts",
        version: "4.7.3",
        base_image: :ubuntu,
        check_dir: "check",
        extension: "js",
        docker_image: "codebattle/js:16.15",
        solution_version: :typed,
        solution_template:
          "<%= import %>function solution(<%= arguments %>)<%= expected %>{\n\n};\n\nexport default solution;",
        arguments_template: %{
          argument: "<%= name %>: <%= type %>",
          delimeter: ", "
        },
        expected_template: ": <%= type %> ",
        types: %{
          "integer" => "number",
          "float" => "number",
          "string" => "string",
          "array" => "Array<<%= inner_type %>>",
          "boolean" => "boolean",
          "hash" => "any"
        },
        checker_meta: %{
          version: :static,
          type_templates: %TypeTemplates{},
          defining_variable_template: "<%= name %>: <%= type %>",
          nested_value_expression_template: "<%= value %>"
        }
      },
      "dart" => %{
        name: "Dart",
        slug: "dart",
        version: "2.7.1",
        base_image: :ubuntu,
        check_dir: "lib",
        extension: "dart",
        docker_image: "codebattle/dart:2.7.1",
        solution_version: :typed,
        solution_template: "<%= expected %>solution(<%= arguments %>) {\n\n}",
        arguments_template: %{
          argument: "<%= type %> <%= name %>",
          delimeter: ", "
        },
        expected_template: "<%= type %> ",
        types: %{
          "integer" => "int",
          "float" => "double",
          "string" => "String",
          "array" => "List<<%= inner_type %>>",
          "boolean" => "bool",
          "hash" => "Map<String, <%= inner_type %>>"
        },
        checker_meta: %{
          version: :dynamic,
          arguments_delimeter: ", ",
          type_templates: %TypeTemplates{}
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
        solution_version: :typed,
        solution_template:
          "#include <iostream>\n#include <map>\n#include <vector>\n\nusing namespace std;\n\n<%= expected %> solution(<%= arguments %>) {\n\n}",
        arguments_template: %{
          argument: "<%= type %> <%= name %>",
          delimeter: ", "
        },
        expected_template: "<%= type %>",
        types: %{
          "integer" => "int",
          "float" => "double",
          "string" => "string",
          "array" => "vector<<%= inner_type %>>",
          "boolean" => "bool",
          "hash" => "map<string,<%= inner_type %>>"
        },
        checker_meta: %{
          version: :static,
          type_templates: %TypeTemplates{
            array: "{<%= entries %>}",
            hash_inners: "{\"<%= key %>\", <%= value %>}"
          },
          defining_variable_template: "<%= type %> <%= name %>",
          nested_value_expression_template: "<%= type_name %><%= value %>"
        }
      },
      "java" => %{
        name: "Java",
        slug: "java",
        version: "12",
        base_image: :alpine,
        check_dir: "check",
        extension: "java",
        docker_image: "codebattle/java:12",
        solution_version: :typed,
        solution_template:
          "package solution;\n\nimport java.util.*;import java.util.stream.*;\n\npublic class Solution {\n\tpublic <%= expected %>solution(<%= arguments %>) {\n\n\t}\n}",
        arguments_template: %{
          argument: "<%= type %> <%= name %>",
          delimeter: ", "
        },
        expected_template: "<%= type %> ",
        types: %{
          "integer" => "Integer",
          "float" => "Double",
          "string" => "String",
          "array" => "List<<%= inner_type %>>",
          "boolean" => "Boolean",
          "hash" => "Map<String, <%= inner_type %>>"
        },
        checker_meta: %{
          version: :static,
          type_templates: %TypeTemplates{
            array: "List.of(<%= entries %>)",
            hash_empty: "Map.of()",
            hash_value: "Map.ofEntries(<%= entries %>)",
            hash_inners: "entry(\"<%= key %>\", <%= value %>)"
          },
          defining_variable_template: "<%= type %> <%= name %>",
          nested_value_expression_template: "<%= value %>"
        }
      },
      "kotlin" => %{
        name: "Kotlin",
        slug: "kotlin",
        version: "1.2.71",
        base_image: :alpine,
        check_dir: "check",
        extension: "kt",
        docker_image: "codebattle/kotlin:1.2.71",
        solution_version: :typed,
        solution_template:
          "package solution\n\nimport kotlin.collections.*\n\nfun solution(<%= arguments %>):<%= expected %> {\n\n}",
        arguments_template: %{
          argument: "<%= name %>: <%= type %>",
          delimeter: ", "
        },
        expected_template: " <%= type %>",
        types: %{
          "integer" => "Int",
          "float" => "Double",
          "string" => "String",
          "array" => "List<<%= inner_type %>>",
          "boolean" => "Boolean",
          "hash" => "Map<String, <%= inner_type %>>"
        },
        checker_meta: %{
          version: :static,
          type_templates: %TypeTemplates{
            array: "listOf(<%= entries %>)",
            hash_empty: "mapOf()",
            hash_value: "mapOf(<%= entries %>)",
            hash_inners: "\"<%= key %>\" to <%= value %>"
          },
          defining_variable_template: "<%= name %>: <%= type %>",
          nested_value_expression_template: "<%= value %>"
        }
      },
      "csharp" => %{
        name: "C#",
        slug: "csharp",
        version: "3.1.201",
        base_image: :ubuntu,
        check_dir: "check",
        extension: "cs",
        docker_image: "codebattle/csharp:3.1.201",
        solution_version: :typed,
        solution_template:
          "using System;using System.Collections.Generic;\n\nnamespace app\n{\n\tpublic class Solution\n\t{\n\t\tpublic<%= expected %> solution(<%= arguments %>)\n\t\t{\n\n\t\t}\n\t}\n}",
        arguments_template: %{
          argument: "<%= type %> <%= name %>",
          delimeter: ", "
        },
        expected_template: " <%= type %>",
        types: %{
          "integer" => "int",
          "float" => "double",
          "string" => "string",
          "array" => "List<<%= inner_type %>>",
          "boolean" => "bool",
          "hash" => "Dictionary<string, <%= inner_type %>>"
        },
        checker_meta: %{
          version: :static,
          type_templates: %TypeTemplates{
            array: "{<%= entries %>}",
            hash_empty: "{}",
            hash_value: "{<%= entries %>}",
            hash_inners: "{\"<%= key %>\", <%= value %>}"
          },
          defining_variable_template: "<%= type %> <%= name %>",
          nested_value_expression_template: "new <%= type_name %>()<%= value %>"
        }
      },
      "golang" => %{
        name: "golang",
        slug: "golang",
        version: "1.17.0",
        base_image: :ubuntu,
        check_dir: "check",
        extension: "go",
        docker_image: "codebattle/golang:1.17.0",
        solution_version: :typed,
        solution_template:
          "package main;\n\nfunc solution(<%= arguments %>)<%= expected %> {\n\n}",
        arguments_template: %{
          argument: "<%= name %> <%= type %>",
          delimeter: ", "
        },
        expected_template: " <%= type %>",
        types: %{
          "integer" => "int64",
          "float" => "float64",
          "string" => "string",
          "array" => "[]<%= inner_type %>",
          "boolean" => "bool",
          "hash" => "map[string]<%= inner_type %>"
        },
        checker_meta: %{
          version: :static,
          type_templates: %TypeTemplates{
            array: "{<%= entries %>}"
          },
          defining_variable_template: "<%= name %> <%= type %>",
          nested_value_expression_template: "<%= type_name %><%= value %>"
        }
      },
      "elixir" => %{
        name: "elixir",
        slug: "elixir",
        version: "1.13",
        base_image: :ubuntu,
        check_dir: "check",
        extension: "exs",
        docker_image: "codebattle/elixir:1.13",
        solution_version: :default,
        solution_template:
          "defmodule Solution do\n\tdef solution(<%= arguments %>) do\n<%= return_statement %>\n\tend\nend",
        arguments_template: %{
          argument: "<%= name %>",
          delimeter: ", "
        },
        return_template: "\t\t<%= default_value %>",
        default_values: %{
          "integer" => "0",
          "float" => "0.1",
          "string" => "\"value\"",
          "array" => "[<%= value %>]",
          "boolean" => "false",
          "hash" => "%{\"key\": <%= value %>}"
        },
        checker_meta: %{
          version: :dynamic,
          arguments_delimeter: ", ",
          type_templates: %TypeTemplates{
            hash_empty: "%{}",
            hash_value: "%{<%= entries %>}"
          }
        }
      },
      "python" => %{
        name: "python",
        slug: "python",
        version: "3.11.0",
        base_image: :ubuntu,
        check_dir: "check",
        extension: "py",
        docker_image: "codebattle/python:3.11.0",
        solution_version: :typed,
        solution_template:
          "from typing import List, Dict\n\ndef solution(<%= arguments %>)<%= expected %>:",
        arguments_template: %{
          argument: "<%= name %>: <%= type %>",
          delimeter: ", "
        },
        expected_template: " -> <%= type %>",
        types: %{
          "integer" => "int",
          "float" => "float",
          "string" => "str",
          "array" => "List[<%= inner_type %>]",
          "boolean" => "bool",
          "hash" => "Dict[str, <%= inner_type %>]"
        },
        checker_meta: %{
          version: :dynamic,
          arguments_delimeter: ", ",
          type_templates: %TypeTemplates{
            boolean_true: "True",
            boolean_false: "False"
          }
        }
      },
      "php" => %{
        name: "php",
        slug: "php",
        version: "8.1.1",
        base_image: :ubuntu,
        check_dir: "check",
        extension: "php",
        docker_image: "codebattle/php:8.1.1",
        solution_version: :typed,
        solution_template:
          "<?php\n\nfunction solution(<%= arguments %>)\n{<%= return_statement %>\n}",
        return_template: "\n    return <%= default_value %>;",
        arguments_template: %{
          argument: "<%= type %> $<%= name %>",
          delimeter: ", "
        },
        default_values: %{
          "integer" => "0",
          "float" => "0.1",
          "string" => "\"value\"",
          "array" => "[<%= value %>]",
          "boolean" => "false",
          "hash" => "array(\"key\" => <%= value %>)"
        },
        checker_meta: %{
          version: :dynamic,
          arguments_delimeter: ", ",
          type_templates: %TypeTemplates{
            array: "array(<%= entries %>)",
            hash_empty: "array()",
            hash_value: "array(<%= entries %>)",
            hash_inners: "\"<%= key %>\" => <%= value %>"
          }
        },
        types: %{
          "integer" => "int",
          "float" => "float",
          "string" => "string",
          "array" => "array",
          "boolean" => "bool",
          "hash" => "array"
        }
      },
      "clojure" => %{
        name: "clojure",
        slug: "clojure",
        version: "1.11.1",
        base_image: :ubuntu,
        check_dir: "check",
        extension: "clj",
        docker_image: "codebattle/clojure:1.11.1.1149",
        solution_version: :default,
        solution_template: "(defn solution [<%= arguments %>] <%= return_statement %>)",
        arguments_template: %{
          argument: "<%= name %>",
          delimeter: " "
        },
        return_template: "<%= default_value %>",
        default_values: %{
          "integer" => "0",
          "float" => "0.1",
          "string" => "\"value\"",
          "array" => "[<%= value %>]",
          "boolean" => "false",
          "hash" => "{:key <%= value %>}"
        },
        checker_meta: %{
          version: :dynamic,
          arguments_delimeter: ", ",
          type_templates: %TypeTemplates{
            hash_inners: ":<%= key %> <%= value %>"
          }
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
        solution_version: :typed,
        solution_template:
          "module Check.Solution where\n\nimport qualified Data.HashMap.Lazy as HM\n\nsolution :: <%= arguments %><%= expected %>\nsolution =\n\n{- Included packages:\naeson\nbytestring\ncase-insensitive\ncontainers\ndeepseq\nfgl\ninteger-logarithms\nmegaparsec\nmtl\nparser-combinators\npretty\nrandom\nregex-base\nregex-compat\nregex-posix\nscientific\nsplit\ntemplate-haskell\ntext\ntime\ntransformers\nunordered-containers\nvector\nvector-algorithms -}",
        arguments_template: %{
          argument: "<%= type %>",
          delimeter: " -> "
        },
        expected_template: " -> <%= type %>",
        types: %{
          "integer" => "Int",
          "float" => "Double",
          "string" => "String",
          "array" => "[<%= inner_type %>]",
          "boolean" => "Bool",
          "hash" => "HM.HashMap String <%= inner_type %>"
        },
        checker_meta: %{
          version: :dynamic,
          arguments_delimeter: " ",
          type_templates: %TypeTemplates{
            boolean_true: "True",
            boolean_false: "False",
            hash_empty: "empty"
          }
        }
      }
    }
  end
end
