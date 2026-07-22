defmodule Codebattle.CodeCheck.OutputParserTest do
  use ExUnit.Case, async: true

  alias Codebattle.CodeCheck.OutputParser

  test "delegates version two tokens" do
    result = OutputParser.call(%{lang_meta: %{output_version: 2}, execution_error: :timeout})
    assert result.status == "service_timeout"
  end

  test "maps executor timeouts and failures" do
    assert OutputParser.call(%{execution_error: :timeout}).status == "service_timeout"

    result = OutputParser.call(%{execution_error: :unavailable})
    assert result.status == "service_failure"
    assert result.output == ":unavailable"
  end

  test "accepts a checker message carrying the expected seed" do
    message = ~s({"status":"success","result":"__seed:abc__"})

    result =
      OutputParser.call(%{
        execution_error: nil,
        container_output: "compiler output\n#{message}\n",
        container_stderr: "",
        exit_code: 0,
        seed: "abc"
      })

    assert result.status == "ok"
    assert result.result == message
    assert result.output == "compiler output\n"
  end

  test "collects failed and successful assertions when the seed mismatches" do
    failure = ~s({"status":"failure","arguments":[1],"result":0})
    success = ~s({"status":"success","arguments":[2],"result":2})
    output = "prefix\n#{failure}\n#{success}\n"

    result =
      OutputParser.call(%{
        execution_error: nil,
        container_output: output,
        container_stderr: "",
        exit_code: 0,
        seed: "expected"
      })

    assert result.status == "failure"
    assert result.result == failure
    assert result.asserts == [failure, success]
    assert result.success_count == 1
    assert result.asserts_count == 2
    assert result.output == "prefix\n#{failure}"
  end

  test "returns checker errors when a status error is present" do
    result =
      OutputParser.call(%{
        execution_error: nil,
        container_output: ~s({"status":"error","result":"bad checker"}),
        container_stderr: "checker stderr",
        exit_code: 1,
        seed: "expected"
      })

    assert result.status == "error"
    assert result.result == "checker stderr"
    assert result.output == "checker stderr"
  end

  test "classifies memory, timeout, compiler, and unknown failures without status JSON" do
    base = %{execution_error: nil, container_stderr: "stderr", seed: "seed"}

    memory = OutputParser.call(Map.merge(base, %{container_output: "Killed", exit_code: 2}))
    timeout = OutputParser.call(Map.merge(base, %{container_output: "SIGTERM", exit_code: 143}))
    compiler = OutputParser.call(Map.merge(base, %{container_output: "compile failed", exit_code: 2}))
    unknown = OutputParser.call(Map.merge(base, %{container_output: "odd", exit_code: 1}))

    assert memory.output =~ "out of memory"
    assert timeout.output =~ "longer than 15 seconds"
    assert compiler.output =~ "STDERR:\nstderr"
    assert compiler.output =~ "STDOUT:compile failed"
    assert unknown.output =~ "UNKNOWN_ERROR: odd"

    for result <- [memory, timeout, compiler, unknown] do
      assert result.status == "error"
      assert Jason.decode!(result.result)["status"] == "error"
    end
  end
end
