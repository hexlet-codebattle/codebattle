defmodule Codebattle.Bot.PlaybookStoreTask do
  @moduledoc """
  Task for async storing playbooks of winners
  """

  use Task, restart: :transient

  def start_link(params) do
    Task.start_link(__MODULE__, :run, [params])
  end

  def run(params) do
    Codebattle.Repo.insert(params)
  end
end
