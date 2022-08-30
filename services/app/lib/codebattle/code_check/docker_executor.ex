defmodule Codebattle.CodeCheck.DockerExecutor do
  @moduledoc false

  require Logger

  def call(%{docker_command: docker_command, lang_meta: lang_meta, task: task}) do
    [cmd | cmd_opts] = String.split(docker_command)

    {task_time, result} = :timer.tc(fn -> System.cmd(cmd, cmd_opts, stderr_to_stdout: true) end)

    Logger.error(
      "Finished execution for lang: #{lang_meta.slug}, task: #{task.name}, time: #{div(task_time, 1_000)} msecs"
    )

    result
  end
end
