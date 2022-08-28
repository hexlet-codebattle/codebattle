defmodule Codebattle.Languages do
  @moduledoc false

  alias Codebattle.LanguageMeta

  @type_templates %{
    boolean_true: "true",
    boolean_false: "false",
    array: "[<%= entries %>]",
    hash_empty: "{}",
    hash_value: "{<%= entries %>}",
    hash_inners: "\"<%= key %>\": <%= value %>"
  }

  @meta %{
    "ruby" => %LanguageMeta{
      name: "ruby",
      slug: "ruby",
      checker_version: 2,
      version: "3.1.2",
      check_dir: "check",
      solution_file_name: "solution.rb",
      checker_file_name: "checker.rb",
      docker_image: "codebattle/ruby:3.1.2",
      solution_template: "def solution(<%= arguments %>)\n<%= return_statement %>\nend",
      arguments_template: %{
        argument: "<%= name %>",
        delimiter: ", "
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
        arguments_delimiter: ", ",
        type_templates: %{@type_templates | hash_inners: "\"<%= key %>\" => <%= value %>"}
      }
    },
    "js" => %LanguageMeta{
      checker_version: 2,
      name: "Node.js",
      slug: "js",
      version: "16.17.0",
      check_dir: "check",
      solution_file_name: "solution.js",
      checker_file_name: "checker.js",
      docker_image: "codebattle/js:16.17.0",
      solution_template:
        "const _ = require(\"lodash\");\nconst R = require(\"rambda\");\n\nconst solution = (<%= arguments %>) => {\n<%= return_statement %>\n};\n\nmodule.exports = solution;",
      arguments_template: %{
        argument: "<%= name %>",
        delimiter: ", "
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
        arguments_delimiter: ", ",
        type_templates: @type_templates
      }
    },
    "ts" => %LanguageMeta{
      checker_version: 2,
      name: "typescript",
      slug: "ts",
      version: "4.7.4",
      check_dir: "check",
      solution_file_name: "solution.js",
      checker_file_name: "checker.js",
      docker_image: "codebattle/js:16.17.0",
      solution_template:
        "import * as _ from \"lodash\";\nimport * as R from \"rambda\";\n\nfunction solution(<%= arguments %>)<%= expected %>{\n\n};\n\nexport default solution;",
      arguments_template: %{
        argument: "<%= name %>: <%= type %>",
        delimiter: ", "
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
        type_templates: @type_templates,
        defining_variable_template: "<%= name %>: <%= type %>",
        nested_value_expression_template: "<%= value %>"
      }
    },
    "dart" => %LanguageMeta{
      name: "Dart",
      slug: "dart",
      version: "2.17.6",
      check_dir: "lib",
      solution_file_name: "solution.dart",
      checker_file_name: "checker.dart",
      docker_image: "codebattle/dart:2.17.6",
      solution_template: "<%= expected %>solution(<%= arguments %>) {\n\n}",
      arguments_template: %{
        argument: "<%= type %> <%= name %>",
        delimiter: ", "
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
        arguments_delimiter: ", ",
        type_templates: @type_templates
      }
    },
    "cpp" => %LanguageMeta{
      name: "C++",
      slug: "cpp",
      version: "20",
      check_dir: "check",
      solution_file_name: "solution.cpp",
      checker_file_name: "checker.cpp",
      docker_image: "codebattle/cpp:20",
      solution_template:
        "#include <iostream>\n#include <map>\n#include <vector>\n\nusing namespace std;\n\n<%= expected %> solution(<%= arguments %>) {\n\n}",
      arguments_template: %{
        argument: "<%= type %> <%= name %>",
        delimiter: ", "
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
        type_templates: %{
          @type_templates
          | array: "{<%= entries %>}",
            hash_inners: "{\"<%= key %>\", <%= value %>}"
        },
        defining_variable_template: "<%= type %> <%= name %>",
        nested_value_expression_template: "<%= type_name %><%= value %>"
      }
    },
    "java" => %LanguageMeta{
      name: "Java",
      slug: "java",
      version: "18",
      check_dir: "check",
      solution_file_name: "Solution.java",
      checker_file_name: "Checker.java",
      docker_image: "codebattle/java:18",
      solution_template:
        "package solution;\n\nimport java.util.*;import java.util.stream.*;\n\npublic class Solution {\n\tpublic <%= expected %>solution(<%= arguments %>) {\n\n\t}\n}",
      arguments_template: %{
        argument: "<%= type %> <%= name %>",
        delimiter: ", "
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
        type_templates: %{
          @type_templates
          | array: "List.of(<%= entries %>)",
            hash_empty: "Map.of()",
            hash_value: "Map.ofEntries(<%= entries %>)",
            hash_inners: "entry(\"<%= key %>\", <%= value %>)"
        },
        defining_variable_template: "<%= type %> <%= name %>",
        nested_value_expression_template: "<%= value %>"
      }
    },
    "kotlin" => %LanguageMeta{
      name: "Kotlin",
      slug: "kotlin",
      version: "1.6.21",
      check_dir: "check",
      solution_file_name: "solution.kt",
      checker_file_name: "checker.kt",
      docker_image: "codebattle/kotlin:1.6.21",
      solution_template:
        "package solution\n\nimport kotlin.collections.*\n\nfun solution(<%= arguments %>):<%= expected %> {\n\n}",
      arguments_template: %{
        argument: "<%= name %>: <%= type %>",
        delimiter: ", "
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
        type_templates: %{
          @type_templates
          | array: "listOf(<%= entries %>)",
            hash_empty: "mapOf()",
            hash_value: "mapOf(<%= entries %>)",
            hash_inners: "\"<%= key %>\" to <%= value %>"
        },
        defining_variable_template: "<%= name %>: <%= type %>",
        nested_value_expression_template: "<%= value %>"
      }
    },
    "csharp" => %LanguageMeta{
      name: "C#",
      slug: "csharp",
      version: "6.0.100",
      check_dir: "check",
      solution_file_name: "solution.cs",
      checker_file_name: "checker.cs",
      docker_image: "codebattle/csharp:6.0.100",
      solution_template:
        "using System;using System.Collections.Generic;\n\nnamespace app\n{\n\tpublic class Solution\n\t{\n\t\tpublic<%= expected %> solution(<%= arguments %>)\n\t\t{\n\n\t\t}\n\t}\n}",
      arguments_template: %{
        argument: "<%= type %> <%= name %>",
        delimiter: ", "
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
        type_templates: %{
          @type_templates
          | array: "{<%= entries %>}",
            hash_empty: "{}",
            hash_value: "{<%= entries %>}",
            hash_inners: "{\"<%= key %>\", <%= value %>}"
        },
        # TODO: FIX nested lists for CSHARP
        # now it generates:
        # List<List<string>> nested_variable = new List<List<string>>(){{"Jack", "Alice"}};
        # should generate:
        # List<List<string>> nested_variable = new List<List<string>>(){new List<string>(){"Jack", "Alice"}};
        # perhaps we should add new type key and improve generator for nested key support
        defining_variable_template: "<%= type %> <%= name %>",
        nested_value_expression_template: "new <%= type_name %>()<%= value %>"
      }
    },
    "golang" => %LanguageMeta{
      name: "golang",
      slug: "golang",
      version: "1.19.0",
      check_dir: "check",
      solution_file_name: "solution.go",
      checker_file_name: "checker.go",
      docker_image: "codebattle/golang:1.19.0",
      solution_template: "package main;\n\nfunc solution(<%= arguments %>)<%= expected %> {\n\n}",
      arguments_template: %{
        argument: "<%= name %> <%= type %>",
        delimiter: ", "
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
        type_templates: %{@type_templates | array: "{<%= entries %>}"},
        defining_variable_template: "<%= name %> <%= type %>",
        nested_value_expression_template: "<%= type_name %><%= value %>"
      }
    },
    "elixir" => %LanguageMeta{
      name: "elixir",
      slug: "elixir",
      checker_version: 2,
      version: "1.13.4",
      check_dir: "check",
      solution_file_name: "solution.exs",
      checker_file_name: "checker.exs",
      docker_image: "codebattle/elixir:1.13.4",
      solution_template:
        "defmodule Solution do\n\tdef solution(<%= arguments %>) do\n<%= return_statement %>\n\tend\nend",
      arguments_template: %{
        argument: "<%= name %>",
        delimiter: ", "
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
        arguments_delimiter: ", ",
        type_templates: %{@type_templates | hash_empty: "%{}", hash_value: "%{<%= entries %>}"}
      }
    },
    "python" => %LanguageMeta{
      name: "python",
      slug: "python",
      version: "3.10.6",
      check_dir: "check",
      solution_file_name: "solution.py",
      checker_file_name: "checker.py",
      docker_image: "codebattle/python:3.10.6",
      solution_template:
        "from typing import List, Dict\n\ndef solution(<%= arguments %>)<%= expected %>:",
      arguments_template: %{
        argument: "<%= name %>: <%= type %>",
        delimiter: ", "
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
        arguments_delimiter: ", ",
        type_templates: %{@type_templates | boolean_true: "True", boolean_false: "False"}
      }
    },
    "php" => %LanguageMeta{
      name: "php",
      slug: "php",
      version: "8.1.8",
      check_dir: "check",
      solution_file_name: "solution.php",
      checker_file_name: "checker.php",
      docker_image: "codebattle/php:8.1.8",
      solution_template:
        "<?php\n\nfunction solution(<%= arguments %>)\n{<%= return_statement %>\n}",
      return_template: "\n\treturn <%= default_value %>;",
      arguments_template: %{
        argument: "<%= type %> $<%= name %>",
        delimiter: ", "
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
        arguments_delimiter: ", ",
        type_templates: %{
          @type_templates
          | array: "array(<%= entries %>)",
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
    "clojure" => %LanguageMeta{
      name: "clojure",
      slug: "clojure",
      version: "1.11.1",
      check_dir: "check",
      solution_file_name: "solution.clj",
      checker_file_name: "checker.clj",
      docker_image: "codebattle/clojure:1.11.1.1105",
      solution_template: "(defn solution [<%= arguments %>] <%= return_statement %>)",
      arguments_template: %{
        argument: "<%= name %>",
        delimiter: " "
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
        arguments_delimiter: ", ",
        type_templates: %{@type_templates | hash_inners: ":<%= key %> <%= value %>"}
      }
    },
    "haskell" => %LanguageMeta{
      name: "haskell",
      slug: "haskell",
      version: "8.4.3",
      solution_file_name: "Solution.hs",
      checker_file_name: "Checker.hs",
      check_dir: "Check",
      docker_image: "codebattle/haskell:8.4.3",
      solution_template:
        "module Check.Solution where\n\nimport qualified Data.HashMap.Lazy as HM\n\nsolution :: <%= arguments %><%= expected %>\nsolution =\n\n{- Included packages:\naeson\nbytestring\ncase-insensitive\ncontainers\ndeepseq\nfgl\ninteger-logarithms\nmegaparsec\nmtl\nparser-combinators\npretty\nrandom\nregex-base\nregex-compat\nregex-posix\nscientific\nsplit\ntemplate-haskell\ntext\ntime\ntransformers\nunordered-containers\nvector\nvector-algorithms -}",
      arguments_template: %{
        argument: "<%= type %>",
        delimiter: " -> "
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
        arguments_delimiter: " ",
        type_templates: %{
          @type_templates
          | boolean_true: "True",
            boolean_false: "False",
            hash_empty: "empty",
            hash_value: "fromList([<%= entries %>])",
            hash_inners: "(\"<%= key %>\" :: String, <%= value %>)"
            # fromList [(1 :: Int, 'a'), (2, 'b'), (3, 'c')]
        }
      }
    }
  }

  def get_langs, do: Map.keys(@meta)

  def meta, do: @meta

  def meta(slug) do
    case Map.get(@meta, slug) do
      nil -> raise "Unknown language #{slug}"
      meta -> meta
    end
  end
end
