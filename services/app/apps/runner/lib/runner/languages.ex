defmodule Runner.Languages do
  @moduledoc false

  alias Runner.LanguageMeta

  @default_white_list_lang_slugs [
    "clojure",
    "cpp",
    "csharp",
    "dart",
    "elixir",
    "golang",
    "haskell",
    "java",
    "js",
    "zig",
    "kotlin",
    "php",
    "python",
    "ruby",
    "rust",
    "swift",
    "ts"
  ]

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
      version: "4.0.1",
      container_run_timeout: "15s",
      check_dir: "check",
      solution_file_name: "solution.rb",
      checker_file_name: "checker.rb",
      image: "ghcr.io/hexlet-codebattle/ruby:4.0.1",
      solution_template: """
      def solution(<%= arguments %>)
        ans = <%= default_value %>
        return ans
      end
      # <%= comment %>
      """,
      arguments_template: %{argument: "<%= name %>", delimiter: ", "},
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
      version: "24.11.0",
      check_dir: "check",
      container_run_timeout: "15s",
      solution_file_name: "solution.js",
      checker_file_name: "checker.js",
      image: "ghcr.io/hexlet-codebattle/js:24.11.0",
      solution_template: """
      const _ = require("lodash");
      const R = require("rambda");

      const solution = (<%= arguments %>) => {
        let ans = <%= default_value %>;

        return ans;
      };
      // <%= comment %>

      module.exports = solution;
      """,
      arguments_template: %{argument: "<%= name %>", delimiter: ", "},
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
      version: "5.9.3",
      check_dir: "check",
      container_run_timeout: "15s",
      solution_file_name: "solution.js",
      checker_file_name: "checker.js",
      image: "ghcr.io/hexlet-codebattle/js:24.11.0",
      solution_template: """
      import * as _ from "lodash";
      import * as R from "rambda";

      function solution(<%= arguments %>)<%= expected %>{
        let ans = <%= default_value %>;
        return ans;
      };

      // <%= comment %>

      export default solution;
      """,
      arguments_template: %{argument: "<%= name %>: <%= type %>", delimiter: ", "},
      default_values: %{
        "integer" => "0",
        "float" => "0.1",
        "string" => "\"value\"",
        "array" => "[<%= value %>]",
        "boolean" => "true",
        "hash" => "{ key: <%= value %> }"
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
      output_version: 2,
      version: "3.9.4",
      check_dir: "lib",
      container_run_timeout: "20s",
      solution_file_name: "solution.dart",
      checker_file_name: "checker.dart",
      image: "ghcr.io/hexlet-codebattle/dart:3.9.4",
      solution_template: """
      <%= expected %>solution(<%= arguments %>) {
        <%= expected %>ans = <%= default_value %>;
        return ans;
      }
      // <%= comment %>
      """,
      arguments_template: %{argument: "<%= type %> <%= name %>", delimiter: ", "},
      default_values: %{
        "integer" => "0",
        "float" => "0.1",
        "string" => "\"value\"",
        "array" => "[<%= value %>]",
        "boolean" => "true",
        "hash" => "{\"key\": <%= value %>}"
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
      output_version: 2,
      version: "g++23",
      check_dir: "check",
      container_run_timeout: "20s",
      solution_file_name: "solution.cpp",
      checker_file_name: "checker.cpp",
      image: "ghcr.io/hexlet-codebattle/cpp:23",
      solution_template: """
      #include <bits/stdc++.h>

      using namespace std;

      <%= expected %> solution(<%= arguments %>) {
        <%= expected %> ans;
        ans = <%= default_value %>;
        return ans;
      }
      // <%= comment %>
      """,
      arguments_template: %{argument: "<%= type %> <%= name %>", delimiter: ", "},
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
      version: "25",
      check_dir: "check",
      container_run_timeout: "20s",
      solution_file_name: "Solution.java",
      checker_file_name: "Checker.java",
      image: "ghcr.io/hexlet-codebattle/java:25",
      solution_template: """
      package solution;

      import java.util.*;
      import java.util.stream.*;

      public class Solution {
        public <%= expected %>solution(<%= arguments %>) {
          <%= expected %>ans = <%= default_value %>;
          return ans;
        }
      }
      // <%= comment %>
      """,
      arguments_template: %{argument: "<%= type %> <%= name %>", delimiter: ", "},
      default_values: %{
        "integer" => "0",
        "float" => "0.1",
        "string" => "\"value\"",
        "array" => "List.of(<%= value %>)",
        "boolean" => "true",
        "hash" => "Map.of(\"key\", <%= value %>)"
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
      version: "2.2.21",
      output_version: 2,
      check_dir: "check",
      container_run_timeout: "25s",
      solution_file_name: "solution.kt",
      checker_file_name: "checker.kt",
      image: "ghcr.io/hexlet-codebattle/kotlin:2.2.21",
      solution_template: """
      package solution

      import kotlin.collections.*

      fun solution(<%= arguments %>):<%= expected %> {
        var ans = <%= default_value %>
        return ans
      }
      // <%= comment %>
      """,
      arguments_template: %{argument: "<%= name %>: <%= type %>", delimiter: ", "},
      default_values: %{
        "integer" => "0",
        "float" => "0.1",
        "string" => "\"value\"",
        "array" => "mutableListOf(<%= value %>)",
        "boolean" => "true",
        "hash" => "mutableMapOf(\"key\" to <%= value %>)"
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
      output_version: 2,
      version: "9.0.306",
      check_dir: "check",
      container_run_timeout: "25s",
      solution_file_name: "solution.cs",
      checker_file_name: "checker.cs",
      image: "ghcr.io/hexlet-codebattle/csharp:9.0.306",
      solution_template: """
      using System;
      using System.Collections.Generic;

      namespace app
      {
        public class Solution
        {
          public<%= expected %> solution(<%= arguments %>)
          {
           <%= expected %> ans = <%= default_value %>;
            return ans;
          }
        }
      }
      // <%= comment %>
      """,
      arguments_template: %{argument: "<%= type %> <%= name %>", delimiter: ", "},
      default_values: %{
        "integer" => "0",
        "float" => "0.1",
        "string" => "\"value\"",
        "array" => "new()",
        "boolean" => "true",
        "hash" => "new()"
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
          | array: "new() {<%= entries %>}",
            array_of_array: "{new List<<%= type %>> {<%= entries %>}}",
            hash_empty: "new()",
            hash_value: "new() {<%= entries %>}",
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
      version: "1.25.3",
      container_run_timeout: "20s",
      check_dir: "check",
      solution_file_name: "solution.go",
      checker_file_name: "checker.go",
      image: "ghcr.io/hexlet-codebattle/golang:1.25.3",
      solution_template: """
      package main
      // import "fmt"

      func solution(<%= arguments %>)<%= expected %> {
        var ans <%= expected %>
        return ans
      }
      // <%= comment %>
      """,
      arguments_template: %{argument: "<%= name %> <%= type %>", delimiter: ", "},
      default_values: %{
        "integer" => "0",
        "float" => "0.1",
        "string" => "\"value\"",
        "array" => "[]<%= value %>{}",
        "boolean" => "true",
        "hash" => "map[string]<%= value %>{\"key\": <%= value %>}"
      },
      expected_template: " <%= type %>",
      types: %{
        "integer" => "int",
        "float" => "float64",
        "string" => "string",
        "array" => "[]<%= inner_type %>",
        "boolean" => "bool",
        "hash" => "map[string]<%= inner_type %>"
      },
      checker_meta: %{
        version: :static,
        type_templates: %{
          @type_templates
          | array: "[]<%= inner_type %>{<%= entries %>}",
            hash_value: "map[string]<%= inner_type %>{<%= entries %>}"
        },
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
      version: "1.19.1",
      check_dir: "check",
      container_run_timeout: "20s",
      solution_file_name: "solution.exs",
      checker_file_name: "checker.exs",
      image: "ghcr.io/hexlet-codebattle/elixir:1.19.1",
      solution_template: """
      defmodule Solution do
        def solution(<%= arguments %>) do
          ans = <%= default_value %>
          ans
        end
      end
      # <%= comment %>
      """,
      arguments_template: %{argument: "<%= name %>", delimiter: ", "},
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
      version: "3.14.2",
      check_dir: "check",
      container_run_timeout: "15s",
      solution_file_name: "solution.py",
      checker_file_name: "checker.py",
      image: "ghcr.io/hexlet-codebattle/python:3.14.2",
      solution_template: """
      from typing import List, Dict

      def solution(<%= arguments %>)<%= expected %>:
        ans = <%= default_value %>
        return ans
      # <%= comment %>
      """,
      arguments_template: %{argument: "<%= name %>: <%= type %>", delimiter: ", "},
      expected_template: " -> <%= type %>",
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
      version: "8.4.14",
      checker_version: 2,
      output_version: 2,
      generate_checker?: false,
      check_dir: "check",
      container_run_timeout: "15s",
      solution_file_name: "solution.php",
      checker_file_name: "checker.php",
      image: "ghcr.io/hexlet-codebattle/php:8.4.14",
      solution_template: """
      <?php

      function solution(<%= arguments %>) {
        $ans = <%= default_value %>;
        return $ans;
      }
      // <%= comment %>
      """,
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
      version: "1.12.3",
      check_dir: "check",
      checker_version: 2,
      output_version: 2,
      generate_checker?: false,
      container_run_timeout: "15s",
      solution_file_name: "solution.clj",
      checker_file_name: "checker.clj",
      image: "ghcr.io/hexlet-codebattle/clojure:1.12.3",
      solution_template: """
      (defn solution [<%= arguments %>]
        <%= default_value %>
      )
      ; <%= comment %>
      """,
      arguments_template: %{argument: "<%= name %>", delimiter: " "},
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
      version: "9.14.1",
      container_run_timeout: "20s",
      solution_file_name: "Solution.hs",
      checker_file_name: "Checker.hs",
      check_dir: "check",
      image: "ghcr.io/hexlet-codebattle/haskell:9.14.1",
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
      default_values: %{
        "integer" => "0",
        "float" => "0.1",
        "string" => "\"value\"",
        "array" => "[<%= value %>]",
        "boolean" => "True",
        "hash" => "fromList [(\"key\" :: String, <%= value %>)]"
      },
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
    "zig" => %LanguageMeta{
      name: "Zig",
      slug: "zig",
      output_version: 2,
      # https://github.com/ziglang/zig/wiki/Install-Zig-from-a-Package-Manager
      # check version here for alpine
      version: "0.14.1",
      container_run_timeout: "20s",
      solution_file_name: "solution.zig",
      checker_file_name: "checker.zig",
      check_dir: "check",
      image: "ghcr.io/hexlet-codebattle/zig:0.14.1",
      solution_template: """
      const std = @import("std");

      pub fn solution(<%= arguments %>) <%= expected %> {
          const ans: <%= expected %> = <%= default_value %>;
          return ans;
      }
      // <%= comment %>
      """,
      arguments_template: %{argument: "<%= name %>: <%= type %>", delimiter: ", "},
      default_values: %{
        "integer" => "0",
        "float" => "0.1",
        "string" => "\"value\"",
        # &.{ ... } is a pointer to an anonymous array which cleanly coerces to a slice
        "array" => "&.{<%= value %>}",
        "boolean" => "true",
        # build a StringHashMap in a block and return it (like other langs’ literal-style defaults)
        "hash" =>
          "blk: { var m = std.StringHashMap(<%= inner_type %>).init(std.heap.page_allocator); _ = m.put(\"key\", <%= value %>) catch unreachable; break :blk m; }"
      },
      expected_template: "<%= type %>",
      types: %{
        "integer" => "i64",
        "float" => "f64",
        "string" => "[]const u8",
        "array" => "[]const <%= inner_type %>",
        "boolean" => "bool",
        "hash" => "std.StringHashMap(<%= inner_type %>)"
      },
      checker_meta: %{
        version: :static,
        type_templates: %{
          # arrays of values: &.{ a, b, c }
          array: "&.{<%= entries %>}",
          # array of slices: &.{ &.{...}, &.{...} }
          array_of_array: "&.{<%= entries %>}",
          # maps are built via a block expr that returns the map
          hash_empty:
            "blk: { var m = std.StringHashMap(<%= inner_type %>).init(std.heap.page_allocator); break :blk m; }",
          hash_value:
            "blk: { var m = std.StringHashMap(<%= inner_type %>).init(std.heap.page_allocator); <%= entries %>; break :blk m; }",
          # each entry is an insertion statement
          hash_inners: "_ = m.put(\"<%= key %>\", <%= value %>) catch unreachable;",
          boolean_true: "true",
          boolean_false: "false"
        },
        defining_variable_template: "<%= name %>: <%= type %>",
        nested_value_expression_template: "<%= value %>"
      }
    },
    "rust" => %LanguageMeta{
      name: "rust",
      slug: "rust",
      output_version: 2,
      version: "1.90.0",
      container_run_timeout: "20s",
      solution_file_name: "solution.rs",
      checker_file_name: "checker.rs",
      check_dir: "check",
      image: "ghcr.io/hexlet-codebattle/rust:1.90.0",
      solution_template: """
      use std::collections::HashMap;

      pub fn solution(<%= arguments %>) -> <%= expected %> {
        let mut ans: <%= expected %> = <%= default_value %>;
        return ans;
      }
      // <%= comment %>
      """,
      arguments_template: %{argument: "<%= name %>: <%= type %>", delimiter: ", "},
      default_values: %{
        "integer" => "0",
        "float" => "0.1",
        "string" => "String::from(\"value\")",
        "array" => "vec![<%= value %>]",
        "boolean" => "true",
        "hash" => "HashMap::from([(String::from(\"key\"), <%= value %>)])"
      },
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
    },
    "swift" => %LanguageMeta{
      name: "Swift",
      slug: "swift",
      output_version: 2,
      version: "6.1.0",
      container_run_timeout: "20s",
      solution_file_name: "solution.swift",
      checker_file_name: "checker.swift",
      check_dir: "check",
      image: "ghcr.io/hexlet-codebattle/swift:6.1.0",
      solution_template: """
      import Foundation

      func solution(<%= arguments %>) -> <%= expected %> {
        let ans: <%= expected %> = <%= default_value %>
        return ans
      }
      // <%= comment %>
      """,
      arguments_template: %{argument: "_ <%= name %>: <%= type %>", delimiter: ", "},
      default_values: %{
        "integer" => "0",
        "float" => "0.1",
        "string" => "\"value\"",
        "array" => "[<%= value %>]",
        "boolean" => "true",
        "hash" => "[\"key\": <%= value %>]"
      },
      expected_template: "<%= type %>",
      types: %{
        "integer" => "Int",
        "float" => "Double",
        "string" => "String",
        "array" => "[<%= inner_type %>]",
        "boolean" => "Bool",
        "hash" => "[String: <%= inner_type %>]"
      },
      checker_meta: %{
        version: :static,
        type_templates: %{
          @type_templates
          | array: "[<%= entries %>]",
            hash_empty: "[String: Any]()",
            hash_value: "[<%= entries %>]",
            hash_inners: "\"<%= key %>\": <%= value %>"
        },
        defining_variable_template: "<%= name %>: <%= type %>",
        nested_value_expression_template: "<%= value %>"
      }
    },
    "mongodb" => %LanguageMeta{
      name: "MongoDB",
      slug: "mongodb",
      version: "8.0.15",
      checker_version: 2,
      output_version: 2,
      generate_checker?: false,
      container_run_timeout: "20s",
      check_dir: "check",
      image: "ghcr.io/hexlet-codebattle/mongodb:8.0.15",
      solution_file_name: "solution.js",
      checker_file_name: "checker.js"
    },
    "mysql" => %LanguageMeta{
      name: "MySQL",
      slug: "mysql",
      version: "8.4.7",
      checker_version: 2,
      output_version: 2,
      generate_checker?: false,
      container_run_timeout: "20s",
      check_dir: "check",
      image: "ghcr.io/hexlet-codebattle/mysql:8.4.7",
      solution_file_name: "solution.sql",
      checker_file_name: "checker.sql"
    },
    "postgresql" => %LanguageMeta{
      name: "PostgreSQL",
      slug: "postgresql",
      version: "18",
      checker_version: 2,
      output_version: 2,
      generate_checker?: false,
      container_run_timeout: "20s",
      check_dir: "check",
      image: "ghcr.io/hexlet-codebattle/postgresql:18",
      solution_file_name: "solution.sql",
      checker_file_name: "checker.sql"
    },
    "css" => %LanguageMeta{
      name: "CSS",
      slug: "css",
      version: "3",
      checker_version: 2,
      output_version: 2,
      generate_checker?: false,
      container_run_timeout: "20s",
      check_dir: "check",
      image: "ghcr.io/hexlet-codebattle/css:3",
      solution_file_name: "solution.css",
      checker_file_name: "checker.css"
    }
  }

  def get_lang_slugs do
    white_list = get_default_white_list_lang_slugs()
    @meta |> Map.keys() |> Enum.filter(&(&1 in white_list))
  end

  def get_langs do
    white_list = get_default_white_list_lang_slugs()
    @meta |> Map.values() |> Enum.filter(&(&1.slug in white_list))
  end

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

  def get_default_white_list_lang_slugs do
    slugs = Application.get_env(:runner, :white_list_lang_slugs)

    if slugs == [] do
      @default_white_list_lang_slugs
    else
      slugs
    end
  end
end
