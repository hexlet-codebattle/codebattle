defmodule Codebattle.CodeCheck.OutputParserTest do
  use ExUnit.Case, async: true

  alias Codebattle.CodeCheck.OutputParser
  alias Codebattle.CodeCheck.Result

  @token %{lang_meta: Runner.Languages.meta("haskell"), seed: "123", container_output: ""}

  test "parses output with errors" do
    assert OutputParser.call(%{
             @token
             | container_output: ~s({"status": "error", "result": "sdf"})
           }) ==
             %Result{
               asserts_count: 1,
               success_count: 0,
               status: "error",
               output: ~s({"status": "error", "result": "sdf"}),
               result: ~s({"status": "error", "result": "sdf"})
             }
  end

  test "parses output with success" do
    assert OutputParser.call(%{
             @token
             | container_output: ~s({"status": "ok", "result": "__seed:123__"})
           }) ==
             %Result{
               asserts_count: 1,
               success_count: 0,
               status: "ok",
               output: ~s({"status": "ok", "result": "__seed:123__"}),
               result: ~s({"status": "ok", "result": "__seed:123__"})
             }
  end

  test "parses output with failures" do
    assert OutputParser.call(%{
             @token
             | container_output: ~s({"status": "failure", "result": "0", "arguments": [0]}
        {"status": "success", "result": "1"})
           }) ==
             %Result{
               asserts: [
                 ~s({"status": "failure", "result": "0", "arguments": [0]}),
                 ~s({"status": "success", "result": "1"})
               ],
               asserts_count: 2,
               success_count: 1,
               status: "failure",
               output: ~s({"status": "failure", "result": "0", "arguments": [0]}),
               result: ~s({"status": "failure", "result": "0", "arguments": [0]})
             }
  end
end
