defmodule Codebattle.CodeCheck.OutputParser.V2Test do
  use CodebattleWeb.ConnCase, async: true

  alias Codebattle.CodeCheck.Result
  alias Codebattle.CodeCheck.OutputParser

  import CodebattleWeb.Factory

  @success_output """
  {"type":"result","time":0.0076,"value":1,"output":"asdf"}
  {"type":"result","time":0.0076,"value":2,"output":"asdf"}
  """

  @success_json_output """
  [{"type":"result","time":0.0076,"value":1,"output":"asdf"},
  {"type":"result","time":0.0076,"value":2,"output":"asdf"}]
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
    asserts_count: 2,
    output_error: "",
    status: "ok",
    success_count: 2,
    asserts: [
      %Result.V2.AssertResult{
        arguments: [1, 1],
        execution_time: 0.0076,
        expected: 1,
        output: "asdf",
        result: 1,
        status: "success"
      },
      %Result.V2.AssertResult{
        arguments: [2, 1],
        expected: 2,
        result: 2,
        output: "asdf",
        execution_time: 0.0076,
        status: "success"
      }
    ]
  }

  @success_with_warning_expected %Result.V2{
    asserts_count: 1,
    output_error: "",
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
    task =
      insert(:task,
        asserts: [%{arguments: [1, 1], expected: 1}, %{arguments: [2, 1], expected: 2}]
      )

    result =
      OutputParser.V2.call(%{
        task: task,
        container_stderr: "",
        container_output: @success_output,
        exit_code: 0
      })

    assert result == @success_expected
  end

  test "parses success json output" do
    task =
      insert(:task,
        asserts: [%{arguments: [1, 1], expected: 1}, %{arguments: [2, 1], expected: 2}]
      )

    result =
      OutputParser.V2.call(%{
        task: task,
        container_stderr: "",
        container_output: @success_json_output,
        exit_code: 0
      })

    assert result == @success_expected
  end

  test "parses success with warning output" do
    task = insert(:task, asserts: [%{arguments: [1, 1], expected: 1}])

    result =
      OutputParser.V2.call(%{
        task: task,
        container_stderr: "",
        container_output: @success_with_warning,
        exit_code: 0
      })

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

    result =
      OutputParser.V2.call(%{
        task: task,
        container_stderr: "",
        container_output: @failure_output,
        exit_code: 0
      })

    assert result == @failure_expected
  end

  test "parses out of memory error output" do
    task = insert(:task)

    result =
      OutputParser.V2.call(%{
        task: task,
        container_stderr: "",
        container_output: "make *** failed: Killed\n",
        exit_code: 2
      })

    assert result == %Codebattle.CodeCheck.Result.V2{
             asserts: [],
             exit_code: 2,
             asserts_count: 1,
             output_error: "Your solution ran out of memory, please, rewrite it",
             status: "error",
             success_count: 0
           }
  end

  test "parses out timeout termination" do
    task = insert(:task)

    result =
      OutputParser.V2.call(%{
        task: task,
        container_stderr: "",
        container_output: "SIGTERM\n",
        exit_code: 143
      })

    assert result == %Codebattle.CodeCheck.Result.V2{
             asserts: [],
             exit_code: 143,
             asserts_count: 1,
             output_error:
               "Your solution was executed for longer than 15 seconds, try to write more optimally",
             status: "error",
             success_count: 0
           }
  end

  test "parses unexpected termination" do
    task = insert(:task)

    result =
      OutputParser.V2.call(%{
        task: task,
        container_stderr: "lolkek",
        container_output: "asdf",
        exit_code: 37
      })

    assert %Codebattle.CodeCheck.Result.V2{
             asserts: [],
             exit_code: 37,
             asserts_count: 1,
             output_error: "STDERR: lolkek\n\nSTDOUT: asdf\n",
             status: "error",
             success_count: 0
           } == result
  end
end
