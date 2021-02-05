defmodule Codebattle.CodeCheck.OutputParserV2Test do
  use CodebattleWeb.ConnCase, async: true

  alias Codebattle.CodeCheck.CheckResultV2
  alias Codebattle.CodeCheck.OutputParserV2

  import CodebattleWeb.Factory

  @success_output """
  {"type":"result","time":0.0076,"value":1,"output":"asdf"}
  """

  @success_with_warning """
  Warning: something warning about ;)
  {"type":"result","time":0.0076,"value":1,"output":"asdf"}
  """

  @failure_output """
  {"type":"output","time":0,"value":"pre_output","output":"pre_output"}
  {"type":"result","time":0.0076,"value":1,"output":"asdf"}
  {"type":"result","time":0.1234,"value":2,"output":"fdsa"}
  {"type":"error","time":0.1406,"value":"ErrorMessage","output":"Output"}
  """

  @failure_expected %CheckResultV2{
    success_count: 2,
    version: 2,
    asserts_count: 3,
    status: :failure,
    output: "pre_output",
    asserts: [
      %CheckResultV2.AssertResult{
        arguments: [1, 3],
        expected: 4,
        output: "Output",
        result: "ErrorMessage",
        execution_time: 0.1406,
        status: "failure"
      },
      %CheckResultV2.AssertResult{
        status: "success",
        execution_time: 0.0076,
        result: 1,
        expected: 1,
        arguments: [1, 1],
        output: "asdf"
      },
      %CheckResultV2.AssertResult{
        status: "success",
        execution_time: 0.1234,
        result: 2,
        expected: 2,
        arguments: [2, 2],
        output: "fdsa"
      }
    ]
  }

  @success_expected %CheckResultV2{
    asserts_count: 1,
    output: nil,
    status: :ok,
    success_count: 1,
    asserts: [
      %CheckResultV2.AssertResult{
        status: "success",
        execution_time: 0.0076,
        result: 1,
        expected: 1,
        arguments: [1, 1],
        output: "asdf"
      }
    ]
  }

  @success_with_warning_expected %CheckResultV2{
    asserts_count: 1,
    output: "Warning: something warning about ;)",
    status: :ok,
    success_count: 1,
    asserts: [
      %CheckResultV2.AssertResult{
        status: "success",
        execution_time: 0.0076,
        result: 1,
        expected: 1,
        arguments: [1, 1],
        output: "asdf"
      }
    ]
  }

  test "parses success output" do
    task = insert(:task, asserts: "{\"arguments\":[1,1],\"expected\":1}\n")

    result = OutputParserV2.call(@success_output, task)

    assert result == @success_expected
  end

  test "parses success with warning output" do
    task = insert(:task, asserts: "{\"arguments\":[1,1],\"expected\":1}\n")

    result = OutputParserV2.call(@success_with_warning, task)

    assert result == @success_with_warning_expected
  end

  test "parses failure output" do
    task =
      insert(:task,
        asserts:
          "{\"arguments\":[1,1],\"expected\":1}\n{\"arguments\":[2,2],\"expected\":2}\n{\"arguments\":[1,3],\"expected\":4}\n"
      )

    result = OutputParserV2.call(@failure_output, task)

    assert result == @failure_expected
  end

  test "parses error output" do
    task = insert(:task)

    result = OutputParserV2.call("SOME ERROR", task)

    assert result == %Codebattle.CodeCheck.CheckResultV2{
             asserts: [],
             asserts_count: 0,
             output: "SOME ERROR",
             status: :error,
             success_count: 0
           }
  end

  test "parses out of memory error output" do
    task = insert(:task)

    result = OutputParserV2.call("SOME ERROR Error 137 asdf", task)

    assert result == %Codebattle.CodeCheck.CheckResultV2{
             asserts: [],
             asserts_count: 0,
             output: "Your solution ran out of memory, please, rewrite it",
             status: :error,
             success_count: 0
           }
  end
end
