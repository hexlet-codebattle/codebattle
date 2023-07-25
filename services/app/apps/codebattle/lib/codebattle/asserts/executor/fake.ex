defmodule Codebattle.AssertsService.Executor.Fake do
  @moduledoc false

  alias Codebattle.AssertsService.Executor.Token

  @fake_output """
    {"type":"result","time":6.2e-06,"arguments":[1, 2],"expected": 3,"actual": 3,"output":""}
    {"type":"result","time":"8.5e-06","arguments":[5, 3],"expected": 8,"actual": 8,"output":"lol"}
    {"type":"result","time":2.8e-06,"arguments":[1, 1],"expected": 2,"actual": 2,"output":"kek"}
  """

  @spec call(Token.t()) :: Token.t()
  def call(token) do
    %{token | container_output: @fake_output, exit_code: 0}
  end
end
