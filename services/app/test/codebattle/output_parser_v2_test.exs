defmodule Codebattle.CodeCheck.OutputParserV2Test do
  use CodebattleWeb.ConnCase, async: true

  alias Codebattle.CodeCheck.CheckResultV2
  alias Codebattle.CodeCheck.OutputParserV2
  alias Codebattle.Languages

  import CodebattleWeb.Factory

  @output """
  {"type":"output","time":0,"value":"pre_output","output":"pre_output"}
  {"type":"result","time":0.0076,"value":1,"output":"asdf"}
  {"type":"result","time":0.1234,"value":2,"output":"fdsa"}
  {"type":"error","time":0.1406,"value":"ErrorMessage","output":"Output"}
  """
  @expected %CheckResultV2{
    success_count: 2,
    asserts_count: 3,
    status: :failure,
    output: "pre_output",
    asserts: [
      %CheckResultV2.AssertResult{
        type: "result",
        time: 0.0076,
        value: 2,
        expected: 2,
        arguments: [4, 2],
        output: "asdf"
      },
      %CheckResultV2.AssertResult{
        type: "result",
        time: 0.1234,
        value: 1,
        expected: 1,
        arguments: [1, 1],
        output: "fdsa"
      },
      %CheckResultV2.AssertResult{
        type: "error",
        time: 0.1406,
        value: "ErrorMessage",
        expected: 0,
        arguments: [1, 0],
        output: "Output"
      }
    ]
  }

  test "parses output" do
    task =
      insert(:task,
        asserts:
          "{\"arguments\":[1,1],\"expected\":1}\n{\"arguments\":[2,2],\"expected\":2}\n{\"arguments\":[1,3],\"expected\":4}\n"
      )

    lang = Languages.meta()["js"]
    result = OutputParserV2.call(@output, lang, task)

    assert result == @expected
  end
end
