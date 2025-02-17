defmodule Runner.Languages do
  @moduledoc false

  alias Runner.LanguageMeta

  @type_templates %{
    boolean_true: "true",
    boolean_false: "false",
    array: "[<%= entries %>]",
    array_of_array: "[<%= entries %>]",
    hash_empty: "{}",
    hash_value: "{<%= entries %>}",
    hash_inners: "\"<%= key %>\": <%= value %>"
  }

  @meta %{
    "ruby" => %LanguageMeta{
      name: "ruby",
      slug: "ruby",
      checker_version: 2,
      output_version: 2,
      generate_checker?: false,
      version: "3.3.0",
      container_run_timeout: "15s",
      check_dir: "check",
      solution_file_name: "solution.rb",
      checker_file_name: "checker.rb",
      docker_image: "codebattle/ruby:3.3.0",
      solution_template: """
      def solution(<%= arguments %>)
        <%= return_statement %>
      end
      # <%= comment %>
      """,
      arguments_template: %{argument: "<%= name %>", delimiter: ", "},
      return_template: "<%= default_value %>",
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
      output_version: 2,
      generate_checker?: false,
      name: "Node.js",
      slug: "js",
      version: "20.11.1",
      check_dir: "check",
      container_run_timeout: "15s",
      solution_file_name: "solution.js",
      checker_file_name: "checker.js",
      docker_image: "codebattle/js:20.11.1",
      solution_template: """
      const _ = require("lodash");
      const R = require("rambda");

      const solution = (<%= arguments %>) => {
        <%= return_statement %>
      };
      // <%= comment %>

      module.exports = solution;
      """,
      arguments_template: %{argument: "<%= name %>", delimiter: ", "},
      return_template: "return <%= default_value %>;",
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
      },

      # asserts genator params
      generator_dir: "asserts",
      arguments_generator_template:
        "const _ = require(\"lodash\");\nconst R = require(\"rambda\");\nconst { faker } = require(\"@faker-js/faker\")\n\nconst generate = () => {\n  return [];\n}\n\nmodule.exports = generate;",
      arguments_generator_file_name: "arguments.js",
      asserts_generator_file_name: "generator.js"
    },
    "ts" => %LanguageMeta{
      checker_version: 2,
      output_version: 2,
      generate_checker?: false,
      name: "typescript",
      slug: "ts",
      version: "5.4.2",
      check_dir: "check",
      container_run_timeout: "15s",
      solution_file_name: "solution.js",
      checker_file_name: "checker.js",
      docker_image: "codebattle/js:20.11.1",
      solution_template: """
      import * as _ from "lodash";
      import * as R from "rambda";

      function solution(<%= arguments %>)<%= expected %>{

      };

      // <%= comment %>

      export default solution;
      """,
      arguments_template: %{argument: "<%= name %>: <%= type %>", delimiter: ", "},
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
      output_version: 2,
      version: "3.3.1",
      check_dir: "lib",
      container_run_timeout: "20s",
      solution_file_name: "solution.dart",
      checker_file_name: "checker.dart",
      docker_image: "codebattle/dart:3.3.1",
      solution_template: """
      <%= expected %>solution(<%= arguments %>) {

      }
      // <%= comment %>
      """,
      arguments_template: %{argument: "<%= type %> <%= name %>", delimiter: ", "},
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
      output_version: 2,
      version: "g++std=c++20",
      check_dir: "check",
      container_run_timeout: "20s",
      solution_file_name: "solution.cpp",
      checker_file_name: "checker.cpp",
      docker_image: "codebattle/cpp:20",
      solution_template: """
      #include <bits/stdc++.h>

      using namespace std;

      <%= expected %> solution(<%= arguments %>) {
        <%= return_statement %>
      }
      // <%= comment %>
      """,
      arguments_template: %{argument: "<%= type %> <%= name %>", delimiter: ", "},
      return_template: "return <%= default_value %>;",
      default_values: %{
        "integer" => "0",
        "float" => "0.1",
        "string" => "\"value\"",
        "array" => "{<%= value %>}",
        "boolean" => "true",
        "hash" => "{{\"key\", <%= value %>}}"
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
      output_version: 2,
      version: "21",
      check_dir: "check",
      container_run_timeout: "20s",
      solution_file_name: "Solution.java",
      checker_file_name: "Checker.java",
      docker_image: "codebattle/java:21",
      solution_template: """
      package solution;

      import java.util.*;
      import java.util.stream.*;

      public class Solution {
        public <%= expected %>solution(<%= arguments %>) {

        }
      }
      // <%= comment %>
      """,
      arguments_template: %{argument: "<%= type %> <%= name %>", delimiter: ", "},
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
      version: "1.9.23",
      output_version: 2,
      check_dir: "check",
      container_run_timeout: "25s",
      solution_file_name: "solution.kt",
      checker_file_name: "checker.kt",
      docker_image: "codebattle/kotlin:1.9.23",
      solution_template: """
      package solution

      import kotlin.collections.*

      fun solution(<%= arguments %>):<%= expected %> {

      }
      // <%= comment %>
      """,
      arguments_template: %{argument: "<%= name %>: <%= type %>", delimiter: ", "},
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
      output_version: 2,
      version: "8.0.201",
      check_dir: "check",
      container_run_timeout: "25s",
      solution_file_name: "solution.cs",
      checker_file_name: "checker.cs",
      docker_image: "codebattle/csharp:8.0.201",
      solution_template: """
      using System;
      using System.Collections.Generic;

      namespace app
      {
        public class Solution
        {
          public<%= expected %> solution(<%= arguments %>)
          {

          }
        }
      }
      // <%= comment %>
      """,
      arguments_template: %{argument: "<%= type %> <%= name %>", delimiter: ", "},
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
            array_of_array: "{new List<<%= type %>> {<%= entries %>}}",
            hash_empty: "{}",
            hash_value: "{<%= entries %>}",
            hash_inners: "{\"<%= key %>\", <%= value %>}"
        },
        defining_variable_template: "<%= type %> <%= name %>",
        nested_value_expression_template: "new <%= type_name %>()<%= value %>"
      }
    },
    "golang" => %LanguageMeta{
      name: "golang",
      slug: "golang",
      output_version: 2,
      version: "1.22.1",
      container_run_timeout: "20s",
      check_dir: "check",
      solution_file_name: "solution.go",
      checker_file_name: "checker.go",
      docker_image: "codebattle/golang:1.22.1",
      solution_template: """
      package main
      // import "fmt"

      func solution(<%= arguments %>)<%= expected %> {

      }
      // <%= comment %>
      """,
      arguments_template: %{argument: "<%= name %> <%= type %>", delimiter: ", "},
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
      output_version: 2,
      generate_checker?: false,
      version: "1.18.1",
      check_dir: "check",
      container_run_timeout: "20s",
      solution_file_name: "solution.exs",
      checker_file_name: "checker.exs",
      docker_image: "codebattle/elixir:1.18.1",
      solution_template: """
      defmodule Solution do
        def solution(<%= arguments %>) do
          <%= return_statement %>
        end
      end
      # <%= comment %>
      """,
      arguments_template: %{argument: "<%= name %>", delimiter: ", "},
      return_template: "<%= default_value %>",
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
      checker_version: 2,
      output_version: 2,
      generate_checker?: false,
      version: "3.12.2",
      check_dir: "check",
      container_run_timeout: "15s",
      solution_file_name: "solution.py",
      checker_file_name: "checker.py",
      docker_image: "codebattle/python:3.12.2",
      solution_template: """
      from typing import List, Dict

      def solution(<%= arguments %>)<%= expected %>:
        <%= return_statement %>
      # <%= comment %>
      """,
      arguments_template: %{argument: "<%= name %>: <%= type %>", delimiter: ", "},
      expected_template: " -> <%= type %>",
      return_template: "return <%= default_value %>;",
      default_values: %{
        "integer" => "0",
        "float" => "0.1",
        "string" => "\"value\"",
        "array" => "[<%= value %>]",
        "boolean" => "True",
        "hash" => "{\"key\": <%= value %>}"
      },
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
      version: "8.3.3",
      checker_version: 2,
      output_version: 2,
      generate_checker?: false,
      check_dir: "check",
      container_run_timeout: "15s",
      solution_file_name: "solution.php",
      checker_file_name: "checker.php",
      docker_image: "codebattle/php:8.3.3",
      solution_template: """
      <?php

      function solution(<%= arguments %>) {
        <%= return_statement %>
      }
      // <%= comment %>
      """,
      return_template: "return <%= default_value %>;",
      arguments_template: %{argument: "<%= type %> $<%= name %>", delimiter: ", "},
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
      version: "1.11.2.3",
      check_dir: "check",
      checker_version: 2,
      output_version: 2,
      generate_checker?: false,
      container_run_timeout: "15s",
      solution_file_name: "solution.clj",
      checker_file_name: "checker.clj",
      docker_image: "codebattle/clojure:1.11.2.3",
      solution_template: """
      (defn solution [<%= arguments %>]
        <%= return_statement %>
      )
      ; <%= comment %>
      """,
      arguments_template: %{argument: "<%= name %>", delimiter: " "},
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
      output_version: 2,
      version: "9.4.7",
      container_run_timeout: "20s",
      solution_file_name: "Solution.hs",
      checker_file_name: "Checker.hs",
      check_dir: "check",
      docker_image: "codebattle/haskell:9.4.7",
      solution_template: """
      module Solution where

      import qualified Data.HashMap.Lazy as HM

      solution :: <%= typespec %><%= expected %>
      solution <%= arguments %> =

      -- <%= comment %>
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
      """,
      typespec_template: %{argument: "<%= type %>", delimiter: " -> "},
      arguments_template: %{argument: "<%= name %>", delimiter: " "},
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
            hash_value: "(fromList [<%= entries %>])",
            hash_inners: "(\"<%= key %>\" :: String, <%= value %>)"
            # fromList [(1 :: Int, 'a'), (2, 'b'), (3, 'c')]
        }
      }
    },
    "rust" => %LanguageMeta{
      name: "rust",
      slug: "rust",
      output_version: 2,
      version: "1.76.0",
      container_run_timeout: "20s",
      solution_file_name: "solution.rs",
      checker_file_name: "checker.rs",
      check_dir: "check",
      docker_image: "codebattle/rust:1.76.0",
      solution_template: """
      use std::collections::HashMap;

      pub fn solution(<%= arguments %>) -> <%= expected %> {

      }
      // <%= comment %>
      """,
      arguments_template: %{argument: "<%= name %>: <%= type %>", delimiter: ", "},
      expected_template: "<%= type %>",
      types: %{
        "integer" => "i64",
        "float" => "f64",
        "string" => "String",
        "array" => "Vec<<%= inner_type %>>",
        "boolean" => "bool",
        "hash" => "HashMap<String, <%= inner_type %>>"
      },
      checker_meta: %{
        version: :static,
        type_templates: %{
          @type_templates
          | array: "vec![<%= entries %>]",
            hash_empty: "HashMap::new()",
            hash_value: "HashMap::from([<%= entries %>])",
            hash_inners: "(String::from(\"<%= key %>\"), <%= value %>)"
        },
        defining_variable_template: "<%= name %>: <%= type %>",
        nested_value_expression_template: "<%= value %>"
      }
    }
  }

  def get_lang_slugs, do: Map.keys(@meta)
  def get_langs, do: Map.values(@meta)

  def get_timeout_ms(lang_meta) do
    [num, _] = String.split(lang_meta.container_run_timeout, "s")
    String.to_integer(num) * 1000
  end

  def meta, do: @meta

  @spec meta(String.t()) :: LanguageMeta.t()
  def meta("javascript"), do: meta("js")

  def meta(slug) do
    case Map.get(@meta, slug) do
      nil -> raise "Unknown language #{slug}"
      meta -> meta
    end
  end
end
