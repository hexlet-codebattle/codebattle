defmodule Codebattle.CodeCheck.Executor.Fake do
  @moduledoc false

  alias Codebattle.CodeCheck.Checker.Token

  @fake_output_33 """
    {"type":"result","time":0.001,"value":2,"output":""}
    {"type":"result","time":"0.002","value":0,"output":"lol"}
    {"type":"result","time":0.003,"value":0,"output":"kek"}
  """
  @fake_output_66 """
    {"type":"result","time":0.001,"value":2,"output":""}
    {"type":"result","time":"0.002","value":3,"output":"lol"}
    {"type":"result","time":0.003,"value":0,"output":"kek"}
  """
  @fake_output_100 """
    {"type":"result","time":0.001,"value":2,"output":""}
    {"type":"result","time":"0.002","value":3,"output":"lol"}
    {"type":"result","time":0.003,"value":5,"output":"kek"}
  """

  @spec call(Token.t()) :: Token.t()
  def call(%{solution_text: "solve_percent_33"} = token) do
    %{token | container_stderr: "", container_output: @fake_output_33, exit_code: 0}
  end

  @spec call(Token.t()) :: Token.t()
  def call(%{solution_text: "solve_percent_66"} = token) do
    %{token | container_stderr: "", container_output: @fake_output_66, exit_code: 0}
  end

  def call(token) do
    %{token | container_stderr: "", container_output: @fake_output_100, exit_code: 0}
  end
end
