defmodule Codebattle.CodeCheck.FakeExecutor do
  @moduledoc false
  @fake_output_v2 """
    {"type":"result","time":6.2e-06,"value":2,"output":""}
    {"type":"result","time":"8.5e-06","value":3,"output":"lol"}
    {"type":"result","time":2.8e-06,"value":5,"output":"kek"}
  """
  @fake_output """
    {"status": "success", "result": 2, "output": "", "expected": 2, "arguments": "[1, 1]", "execution_time": 2.37}
    {"status": "success", "result": 3, "output": "", "expected": 3, "arguments": "[2, 1]", "execution_time": 1.8}
    {"status": "success", "result": 5, "output": "", "expected": 5, "arguments": "[3, 2]", "execution_time": 1.4}
  """

  def call(%{lang_meta: %{checker_version: 2}} = token), do: {@fake_output_v2, 0}

  def call(token) do
    {@fake_output <> ~s({"status": "ok", "result": "__seed:#{token.seed}__"}), 0}
  end
end
