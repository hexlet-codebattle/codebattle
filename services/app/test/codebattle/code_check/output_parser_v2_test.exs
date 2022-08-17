defmodule Codebattle.CodeCheck.OutputParser.V2Test do
  use CodebattleWeb.ConnCase, async: true

  alias Codebattle.CodeCheck.Result
  alias Codebattle.CodeCheck.OutputParser

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

  @failure_expected %Result.V2{
    success_count: 2,
    version: 2,
    asserts_count: 3,
    status: "failure",
    output_error: "pre_output",
    asserts: [
      %Result.V2.AssertResult{
        arguments: [1, 3],
        expected: 4,
        output: "Output",
        result: "ErrorMessage",
        execution_time: 0.1406,
        status: "failure"
      },
      %Result.V2.AssertResult{
        status: "success",
        execution_time: 0.0076,
        result: 1,
        expected: 1,
        arguments: [1, 1],
        output: "asdf"
      },
      %Result.V2.AssertResult{
        status: "success",
        execution_time: 0.1234,
        result: 2,
        expected: 2,
        arguments: [2, 2],
        output: "fdsa"
      }
    ]
  }

  @success_expected %Result.V2{
    asserts_count: 1,
    output_error: nil,
    status: "ok",
    success_count: 1,
    asserts: [
      %Result.V2.AssertResult{
        status: "success",
        execution_time: 0.0076,
        result: 1,
        expected: 1,
        arguments: [1, 1],
        output: "asdf"
      }
    ]
  }

  @success_with_warning_expected %Result.V2{
    asserts_count: 1,
    output_error: "Warning: something warning about ;)",
    status: "ok",
    success_count: 1,
    asserts: [
      %Result.V2.AssertResult{
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
    task = insert(:task, asserts: [%{arguments: [1, 1], expected: 1}])

    result = OutputParser.V2.call(%{task: task, raw_docker_output: @success_output})

    assert result == @success_expected
  end

  test "parses success with warning output" do
    task = insert(:task, asserts: [%{arguments: [1, 1], expected: 1}])

    result = OutputParser.V2.call(%{task: task, raw_docker_output: @success_with_warning})

    assert result == @success_with_warning_expected
  end

  test "parses failure output" do
    task =
      insert(:task,
        asserts: [
          %{arguments: [1, 1], expected: 1},
          %{arguments: [2, 2], expected: 2},
          %{arguments: [1, 3], expected: 4}
        ]
      )

    result = OutputParser.V2.call(%{task: task, raw_docker_output: @failure_output})

    assert result == @failure_expected
  end

  test "parses error output" do
    task = insert(:task)

    result = OutputParser.V2.call(%{task: task, raw_docker_output: "SOME ERROR"})

    assert result == %Codebattle.CodeCheck.Result.V2{
             asserts: [],
             asserts_count: 0,
             output_error: "SOME ERROR",
             status: "error",
             success_count: 0
           }
  end

  test "parses out of memory error output" do
    task = insert(:task)

    result = OutputParser.V2.call(%{task: task, raw_docker_output: "SOME ERROR Error 137 asdf"})

    assert result == %Codebattle.CodeCheck.Result.V2{
             asserts: [],
             asserts_count: 0,
             output_error: "Your solution ran out of memory, please, rewrite it",
             status: "error",
             success_count: 0
           }
  end
end
