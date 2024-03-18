defmodule Codebattle.CodeCheck.Executor.Fake do
  @moduledoc false

  alias Codebattle.CodeCheck.Checker.Token

  @fake_output_v2 """
    {"type":"result","time":0.001,"value":2,"output":""}
    {"type":"result","time":"0.002","value":3,"output":"lol"}
    {"type":"result","time":0.003,"value":5,"output":"kek"}
  """
  @fake_output """
    {"status": "success", "result": 2, "output": "", "expected": 2, "arguments": "[1, 1]", "execution_time": 2.37}
    {"status": "success", "result": 3, "output": "", "expected": 3, "arguments": "[2, 1]", "execution_time": 1.8}
    {"status": "success", "result": 5, "output": "", "expected": 5, "arguments": "[3, 2]", "execution_time": 1.4}
  """

  @spec call(Token.t()) :: Token.t()
  def call(token = %{lang_meta: %{output_version: 2}}) do
    %{token | container_stderr: "", container_output: @fake_output_v2, exit_code: 0}
  end

  def call(token) do
    seed = to_string(:rand.uniform(10_000_000))

    %{
      token
      | exit_code: 0,
        seed: seed,
        container_output: @fake_output <> ~s({"status": "ok", "result": "__seed:#{seed}__"})
    }
  end
end
