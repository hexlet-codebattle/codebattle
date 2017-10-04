defmodule Codebattle.Bot.PlaybookPlayerTask do
  @moduledoc """
  Process for playing playbooks of tasks
  """

  use Task, restart: :transient

  def start_link(params) do
    Task.start_link(__MODULE__, :run, [params])
  end

  def run(params) do
    Codebattle.Repo.get_by(params.task_id)
  end
end
