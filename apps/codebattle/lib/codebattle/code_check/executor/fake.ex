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

  @fake_dev """
    {"type":"result","time":0.001,"value":2,"output":""}
    {"type":"result","time":0.002,"value":4,"output":""}
    {"type":"result","time":0.003,"value":3,"output":""}
    {"type":"result","time":0.004,"value":5,"output":""}
    {"type":"result","time":0.005,"value":6,"output":""}
    {"type":"result","time":0.006,"value":10,"output":""}
    {"type":"result","time":0.007,"value":22,"output":""}
    {"type":"result","time":0.008,"value":12,"output":""}
    {"type":"result","time":0.009,"value":32,"output":""}
    {"type":"result","time":0.010,"value":51,"output":""}
  """

  @spec call(Token.t()) :: Token.t()
  def call(%{solution_text: "solve_percent_33"} = token) do
    %{token | container_stderr: "", container_output: @fake_output_33, exit_code: 0}
  end

  def call(%{solution_text: "solve_percent_66"} = token) do
    %{token | container_stderr: "", container_output: @fake_output_66, exit_code: 0}
  end

  def call(%{solution_text: "fake_dev"} = token) do
    %{token | container_stderr: "", container_output: @fake_dev, exit_code: 0}
  end

  def call(token) do
    %{token | container_stderr: "", container_output: @fake_output_100, exit_code: 0}
  end
end
