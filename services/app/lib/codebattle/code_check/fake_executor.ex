defmodule Codebattle.CodeCheck.FakeExecutor do
  @moduledoc false

  alias Codebattle.CodeCheck.Result

  def call(%{docker_command: docker_command}) do
    docker_command
  end
end
