defmodule Codebattle.CodeCheck.DockerExecutor do
  @moduledoc false

  def call(%{docker_command: docker_command}) do
    [cmd | cmd_opts] = String.split(docker_command)
    {output, _status} = System.cmd(cmd, cmd_opts, stderr_to_stdout: true)
    output
  end
end
